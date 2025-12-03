// deno-api/api.ts (Bu dosyanın içeriğini yapıştırın)
import { serve } from "https://deno.land/std@0.207.0/http/server.ts";

const db = await Deno.openKv();
const SCORE_KEY = ["scores"];

async function getScores() {
    const scores = [];
    const entries = db.list({ prefix: SCORE_KEY, limit: 100, reverse: false }); 
    
    for await (const entry of entries) {
        const [_, negativeScore, timestamp] = entry.key;

        scores.push({
            nick: entry.value.nick,
            skor: -negativeScore,
            errors: entry.value.errors,
            level: entry.value.level,
            tarih: timestamp
        });
    }
    return scores;
}

async function saveScore(data: any) {
    if (!data.nick || typeof data.skor !== 'number' || data.skor <= 0) {
        return false;
    }

    const negativeScore = -Math.floor(data.skor);
    const timestamp = Date.now(); 

    const key = [...SCORE_KEY, negativeScore, timestamp];

    const value = {
        nick: data.nick.substring(0, 12),
        errors: data.errors || 0,
        level: data.level || 1
    };

    const ok = await db.set(key, value);
    return ok;
}

serve(async (req) => {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/scores") {
        const scores = await getScores();
        return new Response(JSON.stringify(scores), {
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*" 
            }
        });
    } 
    
    else if (req.method === "POST" && url.pathname === "/score") {
        try {
            const data = await req.json();
            const success = await saveScore(data);
            
            return new Response(JSON.stringify({ success, message: success ? "Kayıt başarılı." : "Kayıt başarısız." }), {
                status: success ? 200 : 400,
                headers: { 
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        } catch (e) {
            return new Response(JSON.stringify({ success: false, message: "Geçersiz veri formatı." }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
        }
    }

    // CORS preflight isteği (Tarayıcı güvenliği için)
    else if (req.method === "OPTIONS") {
        return new Response(null, {
             status: 204,
             headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Max-Age": "86400",
             }
        });
    }

    return new Response("404 Not Found", { status: 404 });
});
