/** Preserve reduced-motion styles by default; only an explicit visitor opt-in bypasses them. */
export default function motionPreferenceCss() {
  return {
    postcssPlugin: 'site-motion-preference',
    AtRule: {
      media(atRule) {
        if (!atRule.params.includes('prefers-reduced-motion: reduce') || atRule.raws.motionScoped) return;
        atRule.raws.motionScoped = true;
        // Keep unrelated responsive branches (e.g. mobile video fallbacks) intact.
        const branches = atRule.params.split(',').map(part => part.trim());
        const unrelated = branches.filter(part => !part.includes('prefers-reduced-motion: reduce'));
        if (unrelated.length) {
          const responsive = atRule.cloneBefore({ params: unrelated.join(', ') });
          responsive.raws.motionScoped = true;
          atRule.params = branches.filter(part => part.includes('prefers-reduced-motion: reduce')).join(', ');
        }
        atRule.walkRules(rule => {
          if (rule.parent?.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;
          rule.selectors = rule.selectors.map(selector => {
            if (/^(html|:root)(?=[\s.:#\[>+~]|$)/.test(selector)) {
              return selector.replace(/^(html|:root)/, '$1:not([data-motion="on"])');
            }
            return `:where(html:not([data-motion="on"])) ${selector}`;
          });
        });
      },
    },
  };
}
