import Home from '@/app/page';
import About,{metadata as about} from '@/app/about/page';
import Work,{metadata as work} from '@/app/work/page';
import Dinosaur,{metadata as dinosaur} from '@/app/work/dinosaur/page';
import Dpoc,{metadata as dpoc} from '@/app/work/dpoc/page';
import Drafting,{metadata as drafting} from '@/app/work/drafting/page';
import Lab,{metadata as lab} from '@/app/lab/page';
import { Header, Footer } from '@/components/portfolio';
import { useReveal } from '@/hooks/use-reveal';
export const routes={
 '/':{Page:Home,title:'Andrew Sandoval — Engineering & Projects'},
 '/about':{Page:About,title:about.title},
 '/work':{Page:Work,title:work.title},
 '/work/dinosaur':{Page:Dinosaur,title:dinosaur.title},
 '/work/dpoc':{Page:Dpoc,title:dpoc.title},
 '/work/drafting':{Page:Drafting,title:drafting.title},
 '/lab':{Page:Lab,title:lab.title},
};
export function Portfolio({path}:{path:string}){
 const normalized=path.replace(/\/+$/,'')||'/';
 const route=routes[normalized as keyof typeof routes];
 const Page=route?.Page;
 useReveal();
 return <><a className="skip" href="#main">Skip to content</a><div className="shell"><Header path={normalized}/><main id="main">{Page?<Page/>:<section className="page-intro"><span className="eyebrow">404 / A wrong turn</span><h1 className="page-title">A little too<br/><em>far off the map.</em></h1><a className="text-link" href="/">Return to the portfolio ↗</a></section>}</main><Footer/></div></>;
}
