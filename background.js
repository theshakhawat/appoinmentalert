chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {

    if (
      message.type === "GET_TAB_ID"
    ) {

      sendResponse(
        sender.tab?.id
      );

    }

    return true;

  }
);