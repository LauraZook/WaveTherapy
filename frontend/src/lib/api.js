import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

export const PROTOCOLS_META = {
  health_wellness: {
    title: "Health & Wellness",
    blurb: "Daily vitality, sleep, brain & heart balance — feel energized at any age.",
    image: "https://curawaves.com/cdn/shop/articles/waterfall-by-ruins_9c671a03-d6f2-411a-907a-4ce6180e0e57_480x321_crop_center.jpg",
    icon: "Sparkles",
    accent: "ocean",
  },
  pain_inflammation: {
    title: "Pain & Inflammation",
    blurb: "Acute or chronic pain, arthritis, fibromyalgia, headaches, muscular tension.",
    image: "https://curawaves.com/cdn/shop/products/image1_600x450.jpg?v=1635968769",
    icon: "Activity",
    accent: "terracotta",
  },
  detoxification: {
    title: "Detoxification",
    blurb: "Clear toxins, support liver/kidney/lymph and reset the body's healing capacity.",
    image: "https://curawaves.com/cdn/shop/files/Rocks_2_453x640.jpg?v=1778559745",
    icon: "Droplets",
    accent: "sage",
  },
  immune_boost: {
    title: "Immune System Boost",
    blurb: "Strengthen response to viruses, bacteria, and chronic infections like EBV or Lyme.",
    image: "https://curawaves.com/cdn/shop/products/ScreenShot2022-01-17at10.59.02PM_893x479.png?v=1642489164",
    icon: "Shield",
    accent: "ocean",
  },
  repair_recovery: {
    title: "Repair & Recovery",
    blurb: "Post-surgery healing, injuries, fractures, tendon repair and sports performance.",
    image: "https://curawaves.com/cdn/shop/articles/drewsurfs_8810b14c-e9a0-4def-9aa7-7ba5c7d04a07_480x290_crop_center.jpg",
    icon: "Zap",
    accent: "terracotta",
  },
  meditation: {
    title: "Deep Meditation & Prayer",
    blurb: "Get deeper into your spiritual practice with Wave Therapy for relaxation, focus and clarity.",
    image: "https://images.unsplash.com/photo-1762013728549-f50828e8a113?w=1200&q=80&auto=format&fit=crop",
    icon: "Brain",
    accent: "sage",
  },
};

export const PROTOCOL_ORDER = [
  "health_wellness",
  "pain_inflammation",
  "detoxification",
  "immune_boost",
  "repair_recovery",
  "meditation",
];
