import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
export async function middleware(request:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return NextResponse.next();
 let response=NextResponse.next({request});
 const supabase=createServerClient(url,key,{cookies:{getAll:()=>request.cookies.getAll(),setAll(values:Parameters<SetAllCookies>[0]){values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
 const {data:{user}}=await supabase.auth.getUser();
 if(!user){const login=new URL('/login',request.url);login.searchParams.set('next',request.nextUrl.pathname);return NextResponse.redirect(login);}
 return response;
}
export const config={matcher:['/dashboard/:path*','/clients/:path*','/cases/:path*','/diary/:path*','/invoices/:path*','/settings/:path*']};
