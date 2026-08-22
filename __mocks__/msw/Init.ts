const initMsw = async () => {
  if (typeof window !== 'undefined') {
    const { default: worker } = await import('./Browser');
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    });
  }
};

export default initMsw;
