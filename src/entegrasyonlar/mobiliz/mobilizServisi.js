import { mobilizIstek } from "./mobilizIstek";
import {
    gecerliKoordinatMi,
    rotaNoktasiDonustur,
    sonKonumDonustur,
} from "./mobilizDonusturucu";
import { bugunBaslangic, bugunBitis } from "./mobilizTarih";

export const mobilizServisi = {
    araclar(params = {}) {
        return mobilizIstek("/vehicles", params);
    },

    filolar() {
        return mobilizIstek("/fleets");
    },

    gruplar() {
        return mobilizIstek("/groups");
    },

    async sonKonumlar(params = {}) {
        const sonuc = await mobilizIstek("/activity/last", params);
        return Array.isArray(sonuc)
            ? sonuc.map(sonKonumDonustur).filter(gecerliKoordinatMi)
            : [];
    },

    async konumGecmisi(params = {}) {
        const sonuc = await mobilizIstek("/locations", params);
        return Array.isArray(sonuc)
            ? sonuc.map(rotaNoktasiDonustur).filter(gecerliKoordinatMi)
            : [];
    },

    async aktiviteDetay(params = {}) {
        const sonuc = await mobilizIstek("/activity/detail", params);
        return Array.isArray(sonuc)
            ? sonuc.map(rotaNoktasiDonustur).filter(gecerliKoordinatMi)
            : [];
    },

    gunlukOzet(params = {}) {
        return mobilizIstek("/dailysummary", {
            startTime: bugunBaslangic(),
            endTime: bugunBitis(),
            ...params,
        });
    },

    aktiviteToplam(params = {}) {
        return mobilizIstek("/activity/total", params);
    },
};