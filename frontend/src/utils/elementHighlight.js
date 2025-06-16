// 要素ハイライト機能のヘルパー関数

/**
 * ページ内の要素をハイライト表示する
 * @param {string|Array} target - セレクター文字列または配列
 * @param {string} highlightClass - ハイライト用のCSSクラス名
 * @returns {boolean} - ハイライトが成功したかどうか
 */
export function highlightElement(target, highlightClass = 'axe-highlight') {
  // 既存のハイライトをクリア
  clearHighlights();

  try {
    let selector;
    
    // targetが配列の場合は最初の要素を使用
    if (Array.isArray(target)) {
      selector = target[0];
    } else {
      selector = target;
    }

    // セレクターから要素を取得
    const elements = document.querySelectorAll(selector);
    
    if (elements.length === 0) {
      console.warn('ハイライト対象の要素が見つかりません:', selector);
      return false;
    }

    // 要素にハイライトクラスを追加
    elements.forEach((element, index) => {
      element.classList.add(highlightClass);
      element.setAttribute('data-axe-highlight', 'true');
      
      // 要素が画面内に見えるようにスクロール
      if (index === 0) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    });

    // 5秒後に自動的にハイライトを削除
    setTimeout(() => {
      clearHighlights();
    }, 5000);

    return true;
  } catch (error) {
    console.error('要素のハイライトに失敗しました:', error);
    return false;
  }
}

/**
 * すべてのハイライトをクリアする
 */
export function clearHighlights() {
  const highlightedElements = document.querySelectorAll('[data-axe-highlight="true"]');
  highlightedElements.forEach(element => {
    element.classList.remove('axe-highlight', 'axe-highlight-error', 'axe-highlight-warning');
    element.removeAttribute('data-axe-highlight');
  });
}

/**
 * 要素を一時的にハイライトする（点滅効果）
 * @param {string|Array} target - セレクター文字列または配列
 * @param {string} severity - 重要度（error, warning, info）
 */
export function flashHighlight(target, severity = 'error') {
  const className = `axe-highlight-${severity}`;
  
  try {
    let selector;
    if (Array.isArray(target)) {
      selector = target[0];
    } else {
      selector = target;
    }

    const elements = document.querySelectorAll(selector);
    
    if (elements.length === 0) {
      return false;
    }

    elements.forEach(element => {
      // ハイライトクラスを追加
      element.classList.add(className);
      element.setAttribute('data-axe-highlight', 'true');
      
      // アニメーション終了後にクラスを削除
      setTimeout(() => {
        element.classList.remove(className);
        element.removeAttribute('data-axe-highlight');
      }, 2000);
    });

    // 最初の要素にスクロール
    if (elements.length > 0) {
      elements[0].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }

    return true;
  } catch (error) {
    console.error('フラッシュハイライトに失敗しました:', error);
    return false;
  }
}

/**
 * 複数の要素を同時にハイライトする
 * @param {Array} targets - ターゲットセレクターの配列
 * @param {string} severity - 重要度
 */
export function highlightMultipleElements(targets, severity = 'error') {
  clearHighlights();
  
  targets.forEach(target => {
    highlightElement(target, `axe-highlight-${severity}`);
  });
}

/**
 * 要素の詳細情報を表示するオーバーレイを作成
 * @param {string|Array} target - セレクター
 * @param {Object} elementInfo - 要素の詳細情報
 */
export function showElementOverlay(target, elementInfo) {
  try {
    let selector;
    if (Array.isArray(target)) {
      selector = target[0];
    } else {
      selector = target;
    }

    const element = document.querySelector(selector);
    if (!element) {
      return false;
    }

    // 既存のオーバーレイを削除
    const existingOverlay = document.querySelector('.axe-element-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    // 要素の位置を取得
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    // オーバーレイ要素を作成
    const overlay = document.createElement('div');
    overlay.className = 'axe-element-overlay';
    overlay.style.position = 'absolute';
    overlay.style.top = `${rect.top + scrollTop - 10}px`;
    overlay.style.left = `${rect.left + scrollLeft - 10}px`;
    overlay.style.width = `${rect.width + 20}px`;
    overlay.style.height = `${rect.height + 20}px`;
    overlay.style.border = '3px solid #ff4444';
    overlay.style.backgroundColor = 'rgba(255, 68, 68, 0.1)';
    overlay.style.borderRadius = '4px';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '10000';
    overlay.style.boxShadow = '0 0 0 2px rgba(255, 68, 68, 0.3)';

    // 情報ボックスを作成
    const infoBox = document.createElement('div');
    infoBox.className = 'axe-info-box';
    infoBox.style.position = 'absolute';
    infoBox.style.top = '-60px';
    infoBox.style.left = '0';
    infoBox.style.backgroundColor = '#333';
    infoBox.style.color = 'white';
    infoBox.style.padding = '8px 12px';
    infoBox.style.borderRadius = '4px';
    infoBox.style.fontSize = '12px';
    infoBox.style.whiteSpace = 'nowrap';
    infoBox.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    infoBox.style.pointerEvents = 'auto';
    infoBox.style.cursor = 'pointer';

    // 情報テキストを設定
    infoBox.textContent = `${elementInfo.rule || '要素'}: ${elementInfo.message || '問題が検出されました'}`;
    
    // クリックで閉じる機能
    infoBox.addEventListener('click', () => {
      overlay.remove();
    });

    overlay.appendChild(infoBox);
    document.body.appendChild(overlay);

    // 要素にスクロール
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    });

    // 10秒後に自動削除
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.remove();
      }
    }, 10000);

    return true;
  } catch (error) {
    console.error('要素オーバーレイの表示に失敗しました:', error);
    return false;
  }
}

/**
 * ページ上のすべてのaxe違反要素にバッジを表示
 * @param {Array} violations - axe-coreの違反配列
 */
export function showAllViolationBadges(violations) {
  clearAllBadges();

  violations.forEach((violation, violationIndex) => {
    violation.nodes?.forEach((node, nodeIndex) => {
      try {
        const selector = Array.isArray(node.target) ? node.target[0] : node.target;
        const element = document.querySelector(selector);
        
        if (element) {
          createViolationBadge(element, violation, `${violationIndex}-${nodeIndex}`);
        }
      } catch (error) {
        console.warn('バッジの作成に失敗:', error);
      }
    });
  });
}

/**
 * 要素に違反バッジを追加
 * @param {Element} element - 対象要素
 * @param {Object} violation - 違反情報
 * @param {string} badgeId - バッジのID
 */
function createViolationBadge(element, violation, badgeId) {
  const badge = document.createElement('div');
  badge.className = 'axe-violation-badge';
  badge.setAttribute('data-badge-id', badgeId);
  badge.style.position = 'absolute';
  badge.style.backgroundColor = getSeverityColor(violation.impact);
  badge.style.color = 'white';
  badge.style.padding = '2px 6px';
  badge.style.borderRadius = '3px';
  badge.style.fontSize = '10px';
  badge.style.fontWeight = 'bold';
  badge.style.zIndex = '9999';
  badge.style.cursor = 'pointer';
  badge.style.border = '1px solid rgba(255,255,255,0.3)';
  badge.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
  badge.textContent = getViolationBadgeText(violation.impact);

  // バッジクリック時の動作
  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    showElementOverlay([element], {
      rule: violation.id,
      message: violation.help,
      impact: violation.impact
    });
  });

  // 要素の位置にバッジを配置
  const rect = element.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

  badge.style.top = `${rect.top + scrollTop - 20}px`;
  badge.style.left = `${rect.left + scrollLeft}px`;

  document.body.appendChild(badge);
}

/**
 * すべてのバッジを削除
 */
export function clearAllBadges() {
  const badges = document.querySelectorAll('.axe-violation-badge');
  badges.forEach(badge => badge.remove());
}

/**
 * 重要度に応じた色を取得
 * @param {string} impact - 重要度
 * @returns {string} - CSSカラー
 */
function getSeverityColor(impact) {
  switch (impact) {
    case 'critical':
      return '#d32f2f';
    case 'serious':
      return '#f57c00';
    case 'moderate':
      return '#ffa000';
    case 'minor':
      return '#388e3c';
    default:
      return '#666';
  }
}

/**
 * バッジのテキストを取得
 * @param {string} impact - 重要度
 * @returns {string} - バッジテキスト
 */
function getViolationBadgeText(impact) {
  switch (impact) {
    case 'critical':
      return '致命的';
    case 'serious':
      return '重大';
    case 'moderate':
      return '中程度';
    case 'minor':
      return '軽微';
    default:
      return '問題';
  }
}