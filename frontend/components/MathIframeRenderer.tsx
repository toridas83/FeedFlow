import React, { useMemo } from 'react';

type Props = {
  content: string;
  height?: number;
};

// MathJax를 포함한 독립 iframe에 srcDoc으로 렌더링한다.
// 원문을 그대로 넣고 MathJax가 인라인 수식을 처리하도록 한다.
export const MathIframeRenderer: React.FC<Props> = ({ content, height = 260 }) => {
  const srcDoc = useMemo(() => {
    const safeContent = content || '';
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin: 12px;
      padding: 0;
      color: #111827;
      font-size: 16px;
      line-height: 1.6;
    }
  </style>
  <script>
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
        processEscapes: true
      },
      svg: { fontCache: 'global' }
    };
  </script>
  <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
</head>
<body>
  <div id="preview">${safeContent}</div>
  <script>
    window.addEventListener('load', function() {
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([document.getElementById('preview')]);
      }
    });
  </script>
</body>
</html>`;
  }, [content]);

  return (
    <iframe
      title="math-renderer"
      style={{ width: '100%', border: 'none', overflow: 'auto', borderRadius: 8, background: '#f9fafb' }}
      height={height}
      srcDoc={srcDoc}
      sandbox="allow-same-origin allow-scripts"
    />
  );
};
