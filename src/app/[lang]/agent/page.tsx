import {ConvAI} from "@/components/ConvAI";
import {BackgroundWave} from "@/components/background-wave";
// import {createClient} from '@/utils/supabase/server';
// import {getUser, getSubscription} from '@/utils/supabase/queries';
import {redirect} from "next/navigation";


export default async function Home() {
    // const supabase = createClient();
    
    // Skip authentication on localhost/development
    if (process.env.NODE_ENV === 'development') {
        return (
            <div className="relative grid text-black grid-rows-[auto_1fr_auto] items-center justify-items-center min-h-screen p-4 pb-8 gap-8 sm:p-12 font-[family-name:var(--font-geist-sans)]">
                <BackgroundWave />
                <main className="flex flex-col gap-4 row-start-2 items-center relative z-10">
                    <ConvAI userId={null} subscriptionTier="Enterprise"/>
                </main>
            </div>
        );
    }

    // const user = await getUser(supabase);
    // const subscription = await getSubscription(supabase);

    // Redirect to signin if not authenticated
    // if (!user) {
    //     redirect('/signin/password_signin');
    // }

    let tier: 'Hobby' | 'Freelancer' | 'Professional' | 'Enterprise' | 'Trial' = 'Trial';
  // if (subscription?.prices?.products?.name) {
  //   tier = subscription.prices.products.name as 'Hobby' | 'Freelancer' | 'Professional' | 'Enterprise';
  // }

    return (
        <div className="relative grid text-black grid-rows-[auto_1fr_auto] items-center justify-items-center min-h-screen p-4 pb-8 gap-8 sm:p-12 font-[family-name:var(--font-geist-sans)]">
            <BackgroundWave />
            
            <main className="flex flex-col gap-4 row-start-2 items-center relative z-10">
                <ConvAI userId={null} subscriptionTier="Enterprise"/>
            </main>
        </div>
    );
}
