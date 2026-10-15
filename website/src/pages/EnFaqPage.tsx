import FaqPage, { type FaqCopy } from "./FaqPage";
import { FAQ_SECTIONS_EN } from "../data";

const EN_COPY: FaqCopy = {
  navLabel: "Breadcrumb",
  crumbHome: "Home",
  crumbCurrent: "FAQ",
  homeHref: "en/",
  eyebrow: "Help centre",
  titleLead: "Frequently asked",
  titleAccent: "questions",
  intro:
    "Detailed answers about the technical activation and linking package and streaming player setup: how your provider-issued subscription details arrive, payment methods and refund cases, supported devices, and renewals and switching between servers. Pick a section below or browse all the questions.",
  alsoRead: "Read also:",
  ctaTitle: "Can't find your answer?",
  ctaText:
    "Message our technical support team on WhatsApp and they will help you with activation, technical linking and player setup on your device, step by step — or browse the servers and packages and compare them before you decide.",
  waLabel: "Chat with support on WhatsApp",
  waText: "Hello, I have a question about the technical activation and linking package",
  compareLabel: "See the servers & packages",
  compareHref: "en/",
};

/* صفحة الأسئلة الإنجليزية — نفس بنية الصفحة العربية ومصدر بيانات موازٍ */
export default function EnFaqPage() {
  return <FaqPage sections={FAQ_SECTIONS_EN} copy={EN_COPY} />;
}
