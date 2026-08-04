import katex from 'katex';

export const renderLatex = (text: string, displayMode = false): string => {
  try {
    return katex.renderToString(text, {
      throwOnError: false,
      displayMode,
      trust: true,
    });
  } catch (error) {
    return text;
  }
};

export const hasLatex = (text: string): boolean => {
  return /\$[^$]+\$/.test(text) || /\\[a-zA-Z]+/.test(text);
};

// Advanced helper that replaces $$...$$ and $...$ with rendered math
export const renderRichText = (text: string) => {
  if (!text) return { __html: '' };
  
  let html = text;
  
  // Block Math: $$...$$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
    return renderLatex(math, true);
  });

  // Inline Math: $...$
  html = html.replace(/\$([^$]+)\$/g, (match, math) => {
    return renderLatex(math, false);
  });

  return { __html: html };
};
