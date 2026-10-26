
require("dotenv").config();

const express = require("express");
const webpush = require("web-push");
const cors = require("cors");
const cron = require("node-cron");
const { MongoClient } = require("mongodb");

const app = express();

app.use(
    cors({
        origin: (process.env.ALLOWED_ORIGINS || "")
            .split(",")
            .map(x => x.trim())
            .filter(Boolean)
    })
);
app.use(express.json({ limit: "100kb" }));

const pub = process.env.VAPID_PUBLIC_KEY;
const priv = process.env.VAPID_PRIVATE_KEY;

if (pub && priv) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || "mailto:admin@example.com",
        pub,
        priv
    );
}

const reminders = [
    ["07:30", "A little breakfast hug for Maa 🍫", "Good morning, Maa 💗 Your YogaBar chocolate oats are waiting. Have your breakfast gently and start your day knowing you are loved.", "breakfast"],
    ["10:30", "A tiny snack, Maa 💛", "Maa, a little snack break 🍌 A banana with peanuts or some roasted chana would be lovely. Sending you a tiny hug and lots of love.", "morning-snack"],
    ["13:00", "Lunch break, Maa 🍛", "Maa, take a gentle lunch break 🌼 Have a proper meal with some protein if you can. You deserve nourishment and care.", "lunch"],
    ["16:30", "A little afternoon love for Maa 🍌", "A little note from me, Maa 💌 Grab a quick snack and give your body some energy. I am cheering for you.", "evening-snack"],
    ["18:55", "Maa, dinner decision date 💗", "Maa, take just 2 minutes to choose tonight’s dinner. Pick what sounds good and check what ingredients you have at home. No rush, my love.", "choose-dinner"],
    ["19:30", "Dinner, Maa 🍲", "You made it through another day, Maa 🫶 Make a quick, fresh dinner when you can. I hope you eat well and feel cared for.", "dinner"],
    ["22:15", "A tiny favour for tomorrow, Maa 🥣", "Just two little minutes, Maa 💛 Set out tomorrow’s dry ingredients if you can, so your morning feels a bit easier.", "prep"],
    ["22:45", "Soft landing time, Maa 🌙", "You have done enough for today, Maa 💗 When you can, put the screen aside, take a slow breath, and let yourself rest. You deserve gentleness.", "sleep"]
];

const client = new MongoClient(process.env.MONGODB_URI || "");
let subscriptions;
let sentReminders;

app.get("/", (req, res) => {
    res.json({ service: "Fuel & Love", status: "ok" });
});

app.get("/health", async (req, res) => {
    try {
        const count = await subscriptions.countDocuments();
        res.json({
            status: "ok",
            database: "connected",
            subscribers: count
        });
    } catch (err) {
        console.error("Health check failed:", err.message);
        res.status(503).json({ status: "error", database: "unavailable" });
    }
});
app.get("/vapid-public-key", (req, res) => {
    if (!pub) {
        return res.status(503).json({
            error: "VAPID keys are not configured"
        });
    }

    res.json({ publicKey: pub });
});

app.post("/subscribe", async (req, res) => {
    try {
        const { subscription, device, timezone } = req.body || {};

        if (!subscription?.endpoint || !subscription?.keys) {
            return res.status(400).json({ error: "Valid subscription required" });
        }

        await subscriptions.updateOne(
            { _id: subscription.endpoint },
            {
                $set: {
                    subscription,
                    device: device || null,
                    timezone: timezone || null,
                    updatedAt: new Date()
                },
                $setOnInsert: { createdAt: new Date() }
            },
            { upsert: true }
        );

        res.json({ ok: true });
    } catch (err) {
        console.error("Subscribe failed:", err.message);
        res.status(500).json({ error: "Could not save subscription" });
    }
});

app.post("/unsubscribe", async (req, res) => {
    try {
        const endpoint = req.body?.endpoint;

        if (endpoint) {
            await subscriptions.deleteOne({ _id: endpoint });
        }

        res.json({ ok: true });
    } catch (err) {
        console.error("Unsubscribe failed:", err.message);
        res.status(500).json({ error: "Could not remove subscription" });
    }
});

app.post("/test-push", async (req, res) => {
    const token = process.env.TEST_PUSH_TOKEN;

    if (!token || req.get("Authorization") !== `Bearer ${token}`) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    if (!pub || !priv) {
        return res.status(503).json({ error: "VAPID keys are not configured" });
    }

    try {
        const saved = await subscriptions.find({}).toArray();

        if (saved.length === 0) {
            return res.status(404).json({
                error: "No subscriptions currently stored on the server"
            });
        }

        let delivered = 0;
        let failed = 0;

        for (const item of saved) {
            try {
                await webpush.sendNotification(
                    item.subscription,
                    JSON.stringify({
                        title: "A little love for Maa 💗",
                        body: "This is a test notification! Your Fuel & Love reminders are being tested. 🫶",
                        tag: "test-push",
                        url: "/"
                    })
                );
                delivered++;
            } catch (err) {
                failed++;
                console.error("Test push failed:", err.statusCode, err.message);

                if ([404, 410].includes(err.statusCode)) {
                    await subscriptions.deleteOne({ _id: item._id });
                }
            }
        }

        res.json({
            total: await subscriptions.countDocuments(),
            delivered,
            failed
        });
    } catch (err) {
        console.error("Test push error:", err.message);
        res.status(500).json({ error: "Test push failed" });
    }
});

async function sendScheduledReminder() {
    if (!pub || !priv) return;

    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    })
        .formatToParts(new Date())
        .reduce((obj, part) => {
            obj[part.type] = part.value;
            return obj;
        }, {});

    const day = `${parts.year}-${parts.month}-${parts.day}`;
    const time = `${parts.hour}:${parts.minute}`;
    const reminder = reminders.find(item => item[0] === time);

    if (!reminder) return;

    const key = `${day}:${reminder[3]}`;

    // Persistent duplicate check: survives server restarts.
    if (await sentReminders.findOne({ _id: key })) return;

    const saved = await subscriptions.find({}).toArray();

    for (const item of saved) {
        try {
            await webpush.sendNotification(
                item.subscription,
                JSON.stringify({
                    title: reminder[1],
                    body: reminder[2],
                    tag: reminder[3],
                    url: "/"
                })
            );
        } catch (err) {
            console.error("Scheduled push failed:", err.statusCode, err.message);

            if ([404, 410].includes(err.statusCode)) {
                await subscriptions.deleteOne({ _id: item._id });
            }
        }
    }

    // Record completion only after the send loop finishes.
    await sentReminders.updateOne(
        { _id: key },
        { $setOnInsert: { sentAt: new Date(), reminder: reminder[3] } },
        { upsert: true }
    );
}

async function start() {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI environment variable is required");
    }

    await client.connect();

    const db = client.db(process.env.MONGODB_DB_NAME || "fuel_love");
    subscriptions = db.collection("push_subscriptions");
    sentReminders = db.collection("sent_reminders");

    console.log("Connected to MongoDB Atlas");

    app.listen(process.env.PORT || 3000, () => {
        console.log("Reminder API running");
    });

    cron.schedule("* * * * *", async () => {
        try {
            await sendScheduledReminder();
        } catch (err) {
            console.error("Reminder scheduler error:", err.message);
        }
    });
}

start().catch(err => {
    console.error("Startup failed:", err.message);
    process.exit(1);
});

process.on("SIGTERM", async () => {
    await client.close();
    process.exit(0);
});
