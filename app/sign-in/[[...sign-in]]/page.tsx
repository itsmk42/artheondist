import {SignIn} from '@clerk/nextjs';
export default function Page(){return <main className="auth-page"><a href="/" className="auth-brand">ARTHEON <span>ENERGY</span></a><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/"/><p>A unit of Artheon E-Commerce Pvt. Ltd.</p></main>;}
