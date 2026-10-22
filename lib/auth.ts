import 'server-only';
import {auth,currentUser} from '@clerk/nextjs/server';
export async function getPortalIdentity(){
 const session=await auth();if(!session.isAuthenticated||!session.userId)return null;
 const user=await currentUser();const email=user?.primaryEmailAddress;
 // Only a verified email may claim a dealer identity or the initial Main Admin role.
 if(!user||!email||email.verification?.status!=='verified')return null;
 return {userId:user.id,email:email.emailAddress.toLowerCase()};
}
