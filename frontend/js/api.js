function fetchProfile(telegram_id) {
    return fetch(`/profile/${telegram_id}`).then(r => r.json());
}

function createProfileAPI(data) {
    return fetch("/create-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    }).then(r => r.json());
}

function allocatePointsAPI(data) {
    return fetch("/allocate-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    }).then(r => r.json());
}

function fightAPI(data) {
    return fetch("/fight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    }).then(r => r.json());
}
