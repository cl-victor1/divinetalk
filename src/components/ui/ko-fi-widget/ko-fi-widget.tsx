'use client';

import Script from 'next/script';
import { useState } from 'react';

export default function KoFiWidget() {
  const [kofiScriptLoaded, setKofiScriptLoaded] = useState(false);

  return (
    <>
      <Script 
        async 
        src="https://storage.ko-fi.com/cdn/scripts/overlay-widget.js"
        onLoad={() => setKofiScriptLoaded(true)}
      />
      {kofiScriptLoaded && (
        <Script id="ko-fi-widget" strategy="afterInteractive">
          {`
            if (typeof kofiWidgetOverlay !== 'undefined') {
              kofiWidgetOverlay.draw('buy_victor_a_coffee', {
                'type': 'floating-chat',
                'floating-chat.donateButton.text': 'Support us',
                'floating-chat.donateButton.background-color': '#794bc4',
                'floating-chat.donateButton.text-color': '#fff'
              });
            }
          `}
        </Script>
      )}
    </>
  );
}