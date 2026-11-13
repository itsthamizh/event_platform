// A tiny hash router so the app needs no extra dependencies.
// Swap for react-router later if you prefer; routes are plain strings like '/vendor/:id'.
import { useEffect, useState } from 'react';

function parse() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const [path, qs] = hash.split('?');
  return { path: path || '/', query: Object.fromEntries(new URLSearchParams(qs || '')) };
}

export function useLocation() {
  const [loc, setLoc] = useState(parse);
  useEffect(() => {
    const onChange = () => {
      setLoc(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return loc;
}

export function navigate(to) {
  if (window.location.hash === '#' + to) return;
  window.location.hash = to;
}

export function Link({ to, children, ...rest }) {
  return (
    <a href={'#' + to} {...rest}>
      {children}
    </a>
  );
}

export function matchRoute(pattern, path) {
  const p = pattern.split('/');
  const a = path.split('/');
  if (p.length !== a.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(a[i]);
    else if (p[i] !== a[i]) return null;
  }
  return params;
}

// routes: [{ path: '/x/:id', render: (params, query) => <X/> }]
export function resolve(routes, loc) {
  for (const r of routes) {
    const params = matchRoute(r.path, loc.path);
    if (params) return r.render(params, loc.query);
  }
  return null;
}
