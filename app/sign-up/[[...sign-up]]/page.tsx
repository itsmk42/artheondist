import {SignUp} from '@clerk/nextjs';
export default function Page(){return <main className="auth-page"><a href="/" className="auth-brand">ARTHEON <span>ENERGY</span></a><SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/"/><p>A unit of Artheon E-Commerce Pvt. Ltd.</p></main>;}
