'use client';

import Button from '@/components/ui/Button';
import LogoCloud from '@/components/ui/LogoCloud';
import type { Tables } from '@/types_db';
import { getStripe } from '@/utils/stripe/client';
import { checkoutWithStripe, createStripePortal } from '@/utils/stripe/server';
import { getErrorRedirect } from '@/utils/helpers';
import { User } from '@supabase/supabase-js';
import cn from 'classnames';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
type Subscription = Tables<'subscriptions'>;
type Product = Tables<'products'>;
type Price = Tables<'prices'>;
interface ProductWithPrices extends Product {
  prices: Price[];
}
interface PriceWithProduct extends Price {
  products: Product | null;
}
interface SubscriptionWithProduct extends Subscription {
  prices: PriceWithProduct | null;
}

interface Props {
  user: User | null | undefined;
  products: ProductWithPrices[];
  subscription: SubscriptionWithProduct | null;
}

type BillingInterval = 'lifetime' | 'year' | 'month';
type Currency = 'usd' | 'eur' | 'gbp' | 'jpy' | 'cny' | 'aud' | 'cad' | 'chf' | 'hkd' | 'nzd' | 'sgd' | 'sek' | 'nok' | 'mxn' | 'brl' | 'inr' | 'twd' | 'rub' | 'krw' | 'isk' | 'ars';

// Add this sorting function before the Pricing component
function sortProducts(products: ProductWithPrices[]): ProductWithPrices[] {
  const orderMap = {
    'Hobby': 1,
    'Freelancer': 2,
    'Professional': 3,
    'Enterprise': 4
  };

  return [...products].sort((a, b) => {
    const orderA = orderMap[a.name as keyof typeof orderMap] || 999;
    const orderB = orderMap[b.name as keyof typeof orderMap] || 999;
    return orderA - orderB;
  });
}

export default function Pricing({ user, products, subscription }: Props) {
  const intervals = Array.from(
    new Set(
      products.flatMap((product) =>
        product?.prices?.map((price) => price?.interval)
      )
    )
  );
  const router = useRouter();
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>('year');
  const [priceIdLoading, setPriceIdLoading] = useState<string>();
  const currentPath = usePathname();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('usd');

  const exchangeRates: { [key in Currency]: number } = {
    usd: 1,
    eur: 0.9474,
    gbp: 0.7845,
    jpy: 151.29,
    cny: 7.2594,
    aud: 1.5562,
    cad: 1.4176,
    chf: 0.8785,
    hkd: 7.7713,
    nzd: 1.7100,
    sgd: 1.3401,
    sek: 10.9136,
    nok: 11.1292,
    mxn: 20.2365,
    brl: 6.0793,
    inr: 84.7870,
    twd: 32.4531,
    rub: 99.4909,
    krw: 1427.14,
    isk: 138.38,
    ars: 1015.38
  };

  const calculateMonthlyPrice = (price: Price) => {
    let basePrice = price.interval === 'year' 
      ? (price.unit_amount || 0) / 12 / 100
      : (price.unit_amount || 0) / 100;
    
    // 如果选择的不是美元，进行汇率转换
    if (selectedCurrency !== 'usd') {
      basePrice = basePrice * exchangeRates[selectedCurrency];
    }
    
    return basePrice;
  };

  const calculateYearlySavings = (yearlyPrice: Price, monthlyPrice: Price) => {
    const yearlyTotal = yearlyPrice.unit_amount || 0;
    const monthlyTotal = (monthlyPrice.unit_amount || 0) * 12;
    const savings = ((monthlyTotal - yearlyTotal) / monthlyTotal) * 100;
    return Math.round(savings);
  };

  const handleStripeCheckout = async (price: Price) => {
    try {
      setPriceIdLoading(price.id);

      if (!user) {
        setPriceIdLoading(undefined);
        return router.push('/signin/password_signin');
      }

      if (price.interval !== billingInterval) {
        console.error('Price interval does not match selected billing interval');
        setPriceIdLoading(undefined);
        return;
      }

      const { errorRedirect, sessionId } = await checkoutWithStripe(
        price,
        '/price',
        selectedCurrency
      );

      if (errorRedirect) {
        console.error('Checkout error:', errorRedirect);
        setPriceIdLoading(undefined);
        return router.push(errorRedirect);
      }

    if (!sessionId) {
      setPriceIdLoading(undefined);
      return router.push(
        getErrorRedirect(
          currentPath,
          'An unknown error occurred.',
          'Please try again later or contact a system administrator.'
        )
      );
    }

      const stripe = await getStripe();
      await stripe?.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('Checkout error:', error);
      // 显示错误消息给用户
      // 例如：使用 toast 通知用户当前货币不可用
    } finally {
      setPriceIdLoading(undefined);
    }
  };

  const handleStripePortalRequest = async () => {
    try {
      const redirectUrl = await createStripePortal(currentPath);
      router.push(redirectUrl);
    } catch (error) {
      console.error('Error redirecting to customer portal:', error);
    }
  };

  if (!products.length) {
    return (
      <section className="bg-gray-100">
        <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
          <div className="sm:flex sm:flex-col sm:align-center"></div>
          <p className="text-4xl font-extrabold text-gray-900 sm:text-center sm:text-6xl">
            No subscription plans available. Please check back later.
          </p>
        </div>
        <LogoCloud />
      </section>
    );
  } else {
    return (
      <section className="bg-gray-100">
        <div className="max-w-[1400px] px-4 py-8 mx-auto sm:py-24 sm:px-4 lg:px-6">
          <div className="sm:flex sm:flex-col sm:align-center">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-center sm:text-6xl">
              Choose Your Plan
            </h1>
            <p className="max-w-2xl m-auto mt-5 text-xl text-gray-600 sm:text-center sm:text-2xl">
              Unlock the full potential of AI-powered podcast creation with our flexible plans.
            </p>
            {selectedCurrency !== 'usd' && (
              <p className="max-w-2xl m-auto mt-3 text-sm text-gray-500 sm:text-center">
                Note: Only USD prices are original. Other currency prices are approximate and final pricing will be determined at checkout based on current exchange rates.
              </p>
            )}
            <div className="relative self-center mt-6 rounded-lg p-0.5 flex flex-col items-center sm:mt-8 w-full max-w-[300px] mx-auto">
              <div className="flex border border-gray-200 rounded-lg w-full">
                {intervals.includes('year') && (
                  <button
                    onClick={() => setBillingInterval('year')}
                    type="button"
                    className={`${
                      billingInterval === 'year'
                        ? 'relative w-1/2 bg-blue-500 text-white'
                        : 'ml-0.5 relative w-1/2 border border-transparent text-gray-700'
                    } rounded-md m-1 py-2 text-sm font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 focus:z-10 sm:w-auto sm:px-8 flex-1 text-center justify-center`}
                  >
                    Yearly
                  </button>
                )}
                {intervals.includes('month') && (
                  <button
                    onClick={() => setBillingInterval('month')}
                    type="button"
                    className={`${
                        billingInterval === 'month'
                        ? 'relative w-1/2 bg-blue-500 text-white'
                        : 'ml-0.5 relative w-1/2 border border-transparent text-gray-700'
                    } rounded-md m-1 py-2 text-sm font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 focus:z-10 sm:w-auto sm:px-8 flex-1 text-center justify-center`}
                  >
                    Monthly
                  </button>
                )}
              </div>
              <select 
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value as Currency)}
                className="mt-4 p-2 border rounded-md text-black bg-white text-sm w-full text-center"
              >
                <option value="usd">USD ($)</option>
                <option value="eur">EUR (€)</option>
                <option value="gbp">GBP (£)</option>
                <option value="jpy">JPY (¥)</option>
                <option value="cny">CNY (¥)</option>
                <option value="aud">AUD ($)</option>
                <option value="cad">CAD ($)</option>
                <option value="chf">CHF (₣)</option>
                <option value="hkd">HKD ($)</option>
                <option value="nzd">NZD ($)</option>
                <option value="sgd">SGD ($)</option>
                <option value="sek">SEK (kr)</option>
                <option value="nok">NOK (kr)</option>
                <option value="mxn">MXN ($)</option>
                <option value="brl">BRL (R$)</option>
                <option value="inr">INR (₹)</option>
                <option value="twd">TWD (NT$)</option>
                <option value="rub">RUB (₽)</option>
                <option value="krw">KRW (₩)</option>
                <option value="isk">ISK (kr)</option>
                <option value="ars">ARS ($)</option>
              </select>
              <p className="mt-2 text-sm text-gray-500 text-center">
                Select your preferred currency from the dropdown above. Prices will be converted accordingly.
              </p>
            </div>
          </div>
          <div className="mt-8 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-4 lg:max-w-none lg:mx-auto xl:grid-cols-4">
            {sortProducts(products).map((product) => {
              const price = product?.prices?.find(
                (price) => price.interval === billingInterval
              );
              const monthlyPrice = product?.prices?.find(
                (price) => price.interval === 'month'
              );

              if (!price || !monthlyPrice) {
                console.warn(`No price found for ${product.name} with interval ${billingInterval}`);
                return null;
              }

              const monthlyAmount = calculateMonthlyPrice(price);
              const priceString = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: selectedCurrency || price.currency!,
                minimumFractionDigits: 0
              }).format(monthlyAmount);

              const yearlySavings = billingInterval === 'year' 
                ? calculateYearlySavings(price, monthlyPrice)
                : 0;

              return (
                <div
                  key={product.id}
                  className={cn(
                    'rounded-lg shadow-sm divide-y divide-gray-200 bg-white',
                    {
                      'border-2 border-blue-500': subscription
                        ? product.name === subscription?.prices?.products?.name
                        : product.name === 'Freelancer'
                    }
                  )}
                >
                  <div className="p-6">
                    <h2 className="text-xl sm:text-2xl font-semibold leading-6 text-gray-900">
                      {product.name}
                    </h2>
                    <p className="mt-4 text-sm sm:text-base text-gray-500">{product.description}</p>
                    <p className="mt-8 flex flex-wrap items-baseline gap-x-1">
                      <span className={cn(
                        "text-2xl sm:text-3xl font-extrabold text-gray-900",
                        monthlyAmount >= 1000 && "text-xl sm:text-2xl",
                        monthlyAmount >= 10000 && "text-lg sm:text-xl"
                      )}>
                        {priceString}
                      </span>
                      <span className="text-sm sm:text-base font-medium text-gray-500">
                        /month
                      </span>
                      {billingInterval === 'year' && (
                        <span className="text-xs sm:text-sm font-medium text-green-600 whitespace-nowrap">
                          Save {yearlySavings}%
                        </span>
                      )}
                    </p>
                    {billingInterval === 'year' && (
                      <p className="mt-2 text-xs sm:text-sm text-gray-500">
                        Billed annually
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={priceIdLoading === price.id}
                      onClick={() => {
                        if (subscription) {
                          handleStripePortalRequest();
                        } else {
                          handleStripeCheckout(price);
                        }
                      }}
                      className={cn(
                        "block w-full py-2 mt-8 text-sm font-semibold text-center text-white rounded-md",
                        subscription
                          ? "bg-blue-600 hover:bg-blue-700"
                          : "bg-gray-600 hover:bg-gray-700",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      {priceIdLoading === price.id ? (
                        <span>Loading...</span>
                      ) : subscription ? (
                        'Manage Subscription'
                      ) : (
                        'Get Started'
                      )}
                    </button>
                  </div>
                  <div className="px-6 pt-6 pb-8">
                    <h3 className="text-xs font-semibold text-gray-900 tracking-wide uppercase">
                      What's included
                    </h3>
                    <ul className="mt-6 space-y-4">
                      {getFeatures(product.name ?? '').map((feature, index) => (
                        <li key={index} className="flex space-x-3">
                          <svg
                            className="flex-shrink-0 h-5 w-5 text-green-500"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-xs sm:text-sm text-gray-500 break-words flex-1">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
          {/* <p className="mt-12 text-center">
            <Link href="/" className="text-blue-600 hover:underline">
              Return to Home
            </Link>
          </p> */}
        </div>
       
      </section>
    );
  }
}

function getFeatures(planName: string): string[] {
  const commonFeatures = ['Cancel anytime'];

  const planSpecificFeatures = {
    'Hobby': [
      'Cancel anytime',
      'All text models except OpenAI o1 models',
      'Standard audio quality',
      '6 basic voices',
      'Input text length: Up to 3000 characters',
      'Podcast length: Short',
      'Up to 40 AI-generated podcasts per month',
      'Save up to 5 recent podcasts (if not downloaded manually)',
      'NotebookAI Podcast AI Assistant (Beta)',
      'Discord support',
    ],
    'Freelancer': [
      'Everything in Hobby, plus:',
      'Access to OpenAI o1 text models (except o1-preview)',
      'High audio quality',
      '45 additional versatile voices',      
      'Advanced WorldSpeak text-to-speech model',
      'Input text length: Up to 10000 characters',
      'Podcast length: Medium',
      'Up to 70 AI-generated podcasts per month',
      'Save up to 50 recent podcasts (if not downloaded manually)',
      'Upload PDF or TXT files',
      'AI Podcast Host available in 31 languages with diverse international voices (Beta)',
      'Extract content from public URLs',
      'Generate podcast cover images',
      'Email support',
    ],
    'Professional': [
      'Everything in Freelancer, plus:',      
      'Access to all OpenAI text models including o1-preview',
      '76 international voices spanning various English accents and languages (with even more to come!)',
      'Most life-like, emotionally rich WorldSpeak Pro text-to-speech model',
      'Input text length: Up to 20000 characters',
      'Podcast length: Long',
      'Up to 100 AI-generated podcasts per month',
      'Save all generated podcasts',
      'Fast email support',
      ],
    'Enterprise': [
      'Everything in Professional, plus:',
      'Input text length: Up to 30000 characters',
      'Podcast length: Very Long',
      'Up to 150 AI-generated podcasts per month',
      'Design 3 AI voices from descriptions (contact us to activate this exclusive feature after subscribing!)',
      'Use your own voice (contact us to activate this exclusive feature after subscribing!)',
      'Priority support',
    ]
  };

  return [
    // ...commonFeatures,
    ...(planSpecificFeatures[planName as keyof typeof planSpecificFeatures] || []),
  ];
}
