(function (G) {
  const paths = {
    trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
    home:'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
    team:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8-7a4 4 0 0 1 0 7.8',
    wallet:'M3 6h17v15H3zM3 6V3h14v3m3 6h-6v5h6m-3-2.5h.01',
    calendar:'M4 5h16v16H4zM16 3v4M8 3v4M4 11h16m-11 4h.01m5 0h.01',
    settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8m-8 4 2-2-1-3 3-2 2 1 2-2 2 2 2-1 3 2-1 3 2 2-2 2 1 3-3 2-2-1-2 2-2-2-2 1-3-2 1-3z',
    plus:'M12 5v14M5 12h14', search:'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16m6-2 5 5',
    chevron:'m9 5 7 7-7 7', down:'m6 9 6 6 6-6', close:'m6 6 12 12M6 18 18 6',
    logout:'M9 21H3V3h6m5 5 4 4-4 4m-5-4h12', clock:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20m0-16v6l4 2',
    check:'m5 12 4 4L19 6', edit:'m16 3 5 5-12 12H4v-5zM14 5l5 5', eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7m10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
    shield:'M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7zM8 12l3 3 5-6', leaf:'M20 4C5 2 2 9 6 15s12 5 14-11M5 20l10-11',
    arrow:'M7 17 17 7M7 7h10v10', coins:'M12 8c5 0 8-1.3 8-3s-3-3-8-3-8 1.3-8 3 3 3 8 3m-8-3v6c0 2 3 3 8 3s8-1 8-3V5m-16 6v6c0 2 3 3 8 3s8-1 8-3v-6',
    info:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20m0-11v6m0-10h.01', lock:'M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4',
    file:'M14 2H4v20h16V8zM14 2v6h6M8 13h8m-8 4h6', dots:'M5 12h.01M12 12h.01M19 12h.01', user:'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10M3 22v-2a7 7 0 0 1 7-6h4a7 7 0 0 1 7 6v2'
  };
  G.icon = (key, cls='') => `<svg class="icon ${cls}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[key] || paths.file}"/></svg>`;
})(window.GE);
