'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import initMsw from '../../../../__mocks__/msw/Init';

interface MswProviderProps {
  children: ReactNode;
}

export const MswProvider = ({ children }: MswProviderProps) => {
  const [isMswReady, setIsMswReady] = useState(false);

  useEffect(() => {
    const setupMsw = async () => {
      // 개발 환경에서만 MSW를 활성화하려면 아래 조건을 사용하세요.
      if (process.env.NODE_ENV === 'development') {
        await initMsw();
      }
      setIsMswReady(true);
    };
    setupMsw();
  }, []);

  if (!isMswReady) {
    // MSW가 준비되기 전에는 아무것도 렌더링하지 않거나 로딩 인디케이터를 보여줍니다.
    return null;
  }

  return <>{children}</>;
};
