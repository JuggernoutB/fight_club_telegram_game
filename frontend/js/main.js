let telegram_id;

window.onload = function () {
    const urlParams = new URLSearchParams(window.location.search);
    const isDevMode = urlParams.get("dev") === "1";

    if (window.Telegram && window.Telegram.WebApp?.initDataUnsafe?.user) {
        telegram_id = window.Telegram.WebApp.initDataUnsafe.user.id;
        console.log("Telegram ID:", telegram_id);
    } else if (isDevMode) {
        telegram_id = "test_user";
        console.warn("Dev mode active — using test_user");
    } else {
        console.error("Telegram user data not found.");
        alert("Please open this via your Telegram bot button.");
    }

    if (telegram_id) checkProfile();
};
