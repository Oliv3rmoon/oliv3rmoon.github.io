import '@/app/globals.css';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { Portfolio } from './routes';
const container=document.getElementById('root')!;
const app=<Portfolio path={window.location.pathname}/>;
if(container.children.length)hydrateRoot(container,app);else createRoot(container).render(app);
