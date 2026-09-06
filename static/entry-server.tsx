import { renderToString } from 'react-dom/server';
import { Portfolio, routes } from './routes';
export const paths=Object.keys(routes);
export function render(path:string){return {html:renderToString(<Portfolio path={path}/>),title:routes[path as keyof typeof routes]?.title??'Page not found — Andrew Sandoval'}};
