import type { ComponentProps } from 'react';
export default function SiteImage({unoptimized: _unoptimized,...props}:ComponentProps<'img'>&{unoptimized?:boolean}){
 return <img {...props}/>;
}
