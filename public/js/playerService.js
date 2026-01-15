let playerId = null;

window.spawnPlayer = async function(username) {
    const res = await fetch('/api/player/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    });
    const data = await res.json();
    window.playerId = data.id;
    return data;
};

window.syncPlayer = function(player) {
    if (!window.playerId) return;

    fetch('/api/player/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: window.playerId,
            x: player.x,
            y: player.y,
            hp: player.hp
        })
    });
};

