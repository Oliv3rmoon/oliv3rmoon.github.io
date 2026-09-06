import type { ComponentProps } from 'react';
export default function SiteLink({href='',...props}:ComponentProps<'a'>){
 const destination=href.startsWith('/')&&!href.includes('#')&&!href.endsWith('/')&&!href.includes('.')?href+'/':href;
 return <a href={destination} {...props}/>;
}
