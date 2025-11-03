import puppeteer from 'puppeteer';

/* global document */

const CONTROL_SELECTOR =
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]), textarea, select';

const SUBMIT_SELECTOR =
  'button[type="submit"], input[type="submit"], button:not([type]), input[type="image"]';

const MAX_CONTROL_ISSUES = 5;

export async function analyzeForms({ url, auth = null }) {
  console.log('[formAnalyzer] Starting form analysis', { url });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  try {
    const page = await browser.newPage();

    try {
      if (auth?.username && auth?.password) {
        await page.authenticate({
          username: auth.username,
          password: auth.password,
        });
      }

      await page.goto(url, {
        waitUntil: ['load', 'domcontentloaded', 'networkidle2'],
        timeout: 45000,
      });

      const formData = await page.evaluate(
        (controlSelector, submitSelector, maxControlIssues) => {
          const buildSelector = (element) => {
            if (!element || !element.tagName) {
              return 'unknown';
            }

            const parts = [element.tagName.toLowerCase()];

            if (element.id) {
              parts.push(`#${element.id}`);
            }

            if (element.classList && element.classList.length > 0) {
              const classes = Array.from(element.classList).slice(0, 3).join('.');
              if (classes) {
                parts.push(`.${classes}`);
              }
            }

            return parts.join('');
          };

          const extractLabelText = (labels) =>
            labels
              .map((label) => (label.textContent || '').trim())
              .filter(Boolean);

          const forms = Array.from(document.querySelectorAll('form')).map(
            (form, formIndex) => {
              const controls = Array.from(
                form.querySelectorAll(controlSelector),
              );
              const submitButtons = Array.from(
                form.querySelectorAll(submitSelector),
              );

              const controlDetails = controls.map((control, controlIndex) => {
                const labels = control.labels
                  ? Array.from(control.labels)
                  : [];
                const ariaLabel = control.getAttribute('aria-label') || '';
                const ariaLabelledby =
                  control.getAttribute('aria-labelledby') || '';
                const describedBy =
                  control.getAttribute('aria-describedby') || '';

                const placeholder =
                  control.getAttribute('placeholder') || '';
                const name = control.getAttribute('name') || '';
                const id = control.getAttribute('id') || '';
                const tagName = control.tagName.toLowerCase();

                const typeAttr = control.getAttribute('type');
                const type =
                  (typeAttr ||
                    (tagName === 'textarea'
                      ? 'textarea'
                      : tagName === 'select'
                      ? 'select'
                      : 'text')).toLowerCase();

                const hasVisibleLabel = labels.length > 0;
                const hasAriaLabel =
                  ariaLabel.trim().length > 0 ||
                  ariaLabelledby.trim().length > 0;
                const hasAccessibleName = hasVisibleLabel || hasAriaLabel;

                const controlIssues = [];

                if (!hasAccessibleName) {
                  controlIssues.push({
                    type: 'missing-label',
                    severity: 'error',
                    message:
                      'ラベルまたは aria-label/aria-labelledby が設定されていません。',
                  });
                }

                if (!name) {
                  controlIssues.push({
                    type: 'missing-name',
                    severity: 'warning',
                    message: 'name 属性が未設定です。フォーム送信時に値が送られません。',
                  });
                }

                if (control.required && placeholder.trim().length === 0 && !hasAccessibleName) {
                  controlIssues.push({
                    type: 'required-without-guidance',
                    severity: 'warning',
                    message: '必須項目ですがラベルが無く、入力案内もありません。',
                  });
                }

                const autocomplete = control.getAttribute('autocomplete') || '';
                if (
                  (type === 'email' || type === 'tel' || type === 'text' || type === 'password') &&
                  !autocomplete &&
                  name
                ) {
                  controlIssues.push({
                    type: 'missing-autocomplete',
                    severity: 'info',
                    message: 'autocomplete 属性が未設定です。ユーザー体験向上のため設定を検討してください。',
                  });
                }

                const validationAttributes = ['pattern', 'minlength', 'maxlength', 'min', 'max'];
                const hasValidationAttributes = validationAttributes.some((attr) =>
                  control.hasAttribute(attr),
                );

                const shouldValidate =
                  type === 'email' || type === 'url' || type === 'tel' || type === 'number';

                if (control.required && shouldValidate && !hasValidationAttributes) {
                  controlIssues.push({
                    type: 'missing-validation',
                    severity: 'info',
                    message: '必須項目ですがバリデーション属性が設定されていません。',
                  });
                }

                return {
                  index: controlIndex,
                  selector: buildSelector(control),
                  tagName,
                  type,
                  name,
                  id,
                  labels: extractLabelText(labels),
                  hasLabel: hasAccessibleName,
                  ariaLabel,
                  ariaLabelledby,
                  describedBy,
                  placeholder,
                  required: control.required || false,
                  autocomplete,
                  issues: controlIssues.slice(0, maxControlIssues),
                };
              });

              const formIssues = [];
              if (submitButtons.length === 0) {
                formIssues.push({
                  type: 'missing-submit',
                  severity: 'error',
                  message: '送信ボタンが見つかりません。',
                });
              }

              const controlsMissingLabel = controlDetails.filter(
                (control) =>
                  control.issues.some((issue) => issue.type === 'missing-label'),
              ).length;

              const controlsMissingName = controlDetails.filter(
                (control) =>
                  control.issues.some((issue) => issue.type === 'missing-name'),
              ).length;

              return {
                index: formIndex,
                selector: buildSelector(form),
                id: form.getAttribute('id') || '',
                name: form.getAttribute('name') || '',
                method: (form.getAttribute('method') || 'GET').toUpperCase(),
                action: form.getAttribute('action') || '',
                autocomplete: form.getAttribute('autocomplete') || '',
                novalidate: form.hasAttribute('novalidate'),
                controls: controlDetails,
                submitButtons: submitButtons.map((button) => ({
                  selector: buildSelector(button),
                  text: (button.textContent || '').trim(),
                  type: (button.getAttribute('type') || 'submit').toLowerCase(),
                })),
                issues: formIssues,
                summary: {
                  totalControls: controlDetails.length,
                  controlsMissingLabel,
                  controlsMissingName,
                  hasSubmitButton: submitButtons.length > 0,
                },
              };
            },
          );

          return {
            capturedAt: new Date().toISOString(),
            forms,
          };
        },
        CONTROL_SELECTOR,
        SUBMIT_SELECTOR,
        MAX_CONTROL_ISSUES,
      );

      const totalForms = formData.forms.length;
      const formsWithIssues = formData.forms.filter(
        (form) =>
          form.issues.length > 0 ||
          form.controls.some((control) => control.issues.length > 0),
      ).length;
      const totalControls = formData.forms.reduce(
        (sum, form) => sum + form.summary.totalControls,
        0,
      );
      const controlsMissingLabel = formData.forms.reduce(
        (sum, form) => sum + form.summary.controlsMissingLabel,
        0,
      );
      const controlsMissingName = formData.forms.reduce(
        (sum, form) => sum + form.summary.controlsMissingName,
        0,
      );

      return {
        summary: {
          totalForms,
          formsWithIssues,
          totalControls,
          controlsMissingLabel,
          controlsMissingName,
          checkedAt: formData.capturedAt,
        },
        forms: formData.forms,
      };
    } catch (error) {
      console.error('[formAnalyzer] Page evaluation failed', error);
      throw error;
    } finally {
      await page.close();
    }
  } catch (error) {
    console.error('[formAnalyzer] Analysis failed', error);
    throw error;
  } finally {
    await browser.close();
  }
}
