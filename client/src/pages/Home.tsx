import { useState } from "react";
import { ArrowRight, CalendarDays, Check, FileCheck2, Globe2, Handshake, Menu, Newspaper, PlugZap, Search, Settings2, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import ExecutiveTeam from "@/components/ExecutiveTeam";
import AIPoweredExchange from "@/components/AIPoweredExchange";
import EarnRevenue from "@/components/EarnRevenue";
import messaging from "@/data/exchangeMessaging.json";

const heroImage = "/manus-storage/property-source-devices-transparent_ae62f96f.png";
const networkImage = "/manus-storage/property-source-network-portrait_06fc6b61.png";
const mapImage = "/manus-storage/property-source-world-map_d3b0c44e.png";
const logoImage = "/manus-storage/Property_Hub_Exchange_Clean_Corners_1a5f870b.webp";
const registrationUrl = "https://app.propertysource.app/register";

const strategicPartners = [
  { name: "Kiavi", src: "/manus-storage/kiavi-white_1d9736de.png", scale: 1 },
  { name: "RCN Capital", src: "/manus-storage/rcn-capital-white_3a708ee1.png", scale: 1 },
  { name: "Anchor Loans", src: "/manus-storage/anchor-loans-white_27fa5998.png", scale: 1 },
  { name: "CoreVest Finance", src: "/manus-storage/corevest-finance-white_0767fb13.png", scale: 1 },
  { name: "Conventus", src: "/manus-storage/conventus-white_a375f48b.png", scale: 1.2 },
  { name: "Easy Street Capital", src: "/manus-storage/easy-street-capital-white_3b03b92e.png", scale: 1 },
  { name: "Alpha Funding", src: "/manus-storage/alpha-funding-white_f6c3c8bb.png", scale: 1 },
  { name: "Axe Capital", src: "/manus-storage/axe-capital-white_c3e9dd8e.png", scale: 1.18 },
  { name: "Brick City Capital", src: "/manus-storage/brick-city-capital-white_78db2366.png", scale: 1 },
  { name: "D1 Funds", src: "/manus-storage/d1-funds-white-fitted_ec6b6025.png", scale: 1 },
  { name: "Velocity Lending", src: "/manus-storage/velocity-lending-white_8a70b112.png", scale: 1.55 },
  { name: "Residential Capital Partners", src: "/manus-storage/residential-capital-partners-white_5edf301b.png", scale: 1 },
  { name: "Private Money Lenders", src: "/manus-storage/private-money-lenders-white_eae7029e.png", scale: 1.16 },
  { name: "Colonial Funding Group", src: "/manus-storage/colonial-funding-white_72f62f51.png", scale: 1 },
  { name: "CV3 Financial Services", src: "/manus-storage/cv3-financial-white_80b47451.png", scale: 1 },
  { name: "Peak Private Lending", src: "/manus-storage/peak-private-lending-white_15c799f2.png", scale: 1.1 },
  { name: "Center Street Lending", src: "/manus-storage/center-street-lending-white_d238ff5c.png", scale: 1 },
  { name: "Sky Equity", src: "/manus-storage/sky-equity-white_77d50edc.png", scale: 1 },
  { name: "SimpleBridge", textMark: "SimpleBridge", scale: 1 },
];

const strategicPartnerRail = [...strategicPartners, ...strategicPartners];

const partnerTypes = [
  { icon: "01", title: "Brokerages & real estate agents", text: "Give your agents and clients a branded marketplace connected to global opportunity and authorized AI-agent workflows." },
  { icon: "02", title: "Investor groups & communities", text: "Go beyond a local deal board. Share eligible inventory, connect buyers and sellers, and let members work with their AI agents." },
  { icon: "03", title: "Lenders & loan brokers", text: "Connect borrowers, investors, and referral partners to property opportunities and integrated funding workflows." },
  { icon: "04", title: "Title & settlement networks", text: "Bring your professional network closer to the start of each transaction through connected offers, contracts, and settlement handoff." },
  { icon: "05", title: "Influencers, educators & asset managers", text: "Turn your audience or portfolio network into a free branded marketplace with listings, auctions, and transaction infrastructure." },
  { icon: "06", title: "AI-agent developers & technology teams", text: "Connect registered agents to structured opportunities and authorized workflows for verified people and businesses." },
];

const tools = [
  "Aggregated property listings from connected communities",
  "Built-in offer, contract, and negotiation workflows",
  "Digital handoff to connected title and closing providers",
  "Embedded lenders, insurance, inspections, and service partners",
];

const featureGroups = [
  {
    title: "Connected Infrastructure",
    icon: Globe2,
    features: [
      { title: "Turnkey White-Label", text: "Launch with your domain, logo, colors, and branded registration." },
      { title: "Two-Way API Connection", text: "Connect an existing marketplace through synchronized data integrations." },
      { title: "Aggregated Global Inventory", text: "Syndicate eligible listings across connected marketplaces with source and visibility controls." },
      { title: "Single Sign-On", text: "Give members one login for a worldwide view of deals." },
      { title: "Multiple Asset Types", text: "Support residential, multifamily, commercial, industrial, land, and mortgage notes." },
      { title: "Authorized AI-Agent Access", text: "Let registered agents navigate permitted workflows for verified people and businesses." },
    ],
  },
  {
    title: "Discovery & Privacy",
    icon: Search,
    features: [
      { title: "Listing & Bulk Uploads", text: "Create listings individually or import CSV and XML files." },
      { title: "Map-Powered Search", text: "Explore maps, satellite imagery, Street View, and address suggestions." },
      { title: "AI Property Assistant", text: "Research U.S. properties using natural-language text or voice questions." },
      { title: "Blind-Sale Privacy", text: "Protect buyer and seller identities until both parties sign." },
      { title: "Buyer Match Alerts", text: "Notify members by email and text when matching listings appear." },
      { title: "Source & Authority Controls", text: "Keep listing source, visibility, permissions, and transaction evidence connected." },
    ],
  },
  {
    title: "Transactions & Closing",
    icon: FileCheck2,
    features: [
      { title: "Digital Offers & Contracts", text: "Create, negotiate, accept, and electronically sign property agreements." },
      { title: "Transaction Engine", text: "Automate offers, documents, closing, and post-close ownership transfer." },
      { title: "Title Company Handoff", text: "Deliver accepted deals and documents directly into title workflows." },
      { title: "Online Earnest Money", text: "Send required deposits securely to the title company escrow account." },
      { title: "Closing Milestone Tracking", text: "Follow every step from accepted offer through final sale." },
    ],
  },
  {
    title: "Operations & Revenue",
    icon: Settings2,
    features: [
      { title: "Lender & Vendor Network", text: "Access financing, title, inspection, survey, insurance, and legal services." },
      { title: "Revenue Share Controls", text: "Manage marketplace earnings and member-account revenue from one panel." },
      { title: "Owner Dashboard", text: "Track members, activity, sales, transactions, settings, and reports." },
      { title: "Branded Email & SMS", text: "Send alerts, campaigns, announcements, and invitations under your brand." },
      { title: "Live Property Auctions", text: "Set pricing and duration, then manage auctions completely online." },
    ],
  },
];

const announcements = [
  {
    id: "arise-impact-labs-auction-partnership",
    date: "2026-10-06",
    displayDate: "October 6, 2026",
    headline: "Property Hub Partners with Arise Impact Labs to Launch Nationwide Real Estate Auction Services on Property Hub Exchange",
    summary: "Arise Impact Labs partners with Property Hub to launch nationwide real estate auction services on Property Hub Exchange.",
    status: "Press release forthcoming",
  },
  {
    id: "diego-vivona-cto-appointment",
    date: "2026-10-01",
    displayDate: "October 1, 2026",
    headline: "Property Hub Appoints Diego Vivona as Chief Technology Officer to Drive AI-Powered Platform Innovation",
    summary: "Diego Vivona joins Property Hub as Chief Technology Officer to drive AI-powered platform innovation.",
    status: "Press release forthcoming",
  },
  {
    id: "dreamweaver-tech-ip-partnership",
    date: "2026-09-01",
    displayDate: "September 1, 2026",
    headline: "Property Hub Exchange Signs Exclusive Worldwide Intellectual Property Deal with Dreamweaver Tech to Supply the Global Real Estate Exchange Software Platform",
    summary: "An exclusive worldwide intellectual property agreement with Dreamweaver Tech to supply the global real estate exchange software platform.",
    status: "Press release forthcoming",
  },
  {
    id: "mark-kole-chief-operating-officer-appointment",
    date: "2026-09-01",
    displayDate: "September 1, 2026",
    headline: "Property Hub Exchange Names Mark Kole as Chief Operating Officer to Lead the Launch of the Global Real Estate Exchange Platform",
    summary: "Mark Kole is named Chief Operating Officer to lead the company in launching the global real estate exchange platform.",
    status: "Press release forthcoming",
  },
  {
    id: "exclusive-global-platform-partnership",
    date: "2026-09-01",
    displayDate: "September 1, 2026",
    headline: "Property Hub Exchange Signs Exclusive Global Platform Partnership",
    summary: "A major strategic milestone supporting the continued growth of the Property Hub Exchange global real estate exchange.",
    status: "Press release forthcoming",
  },
].sort((a, b) => b.date.localeCompare(a.date));

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState<(typeof announcements)[number] | null>(null);

  const openForm = () => setShowForm(true);
  const goToRegistration = () => { window.open(registrationUrl, "_blank", "noopener,noreferrer"); };
  const submitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowForm(false);
    toast.success("Thanks — your marketplace conversation request is ready.", { description: "A Property Hub Exchange team member will be in touch." });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f8f2] text-[#12352b]">
      <header className="absolute inset-x-0 top-0 z-40">
        <div className="container flex items-center justify-between py-5">
          <a href="#top" className="flex shrink-0 items-center" aria-label="Property Hub Exchange home">
            <span className="inline-flex items-center rounded-full bg-white px-5 py-3 shadow-[0_8px_24px_rgba(0,0,0,.16)]"><img src={logoImage} alt="Property Hub Exchange" width={1200} height={410} className="h-10 w-auto max-w-full shrink-0 object-contain" /></span>
          </a>
          <nav className="hidden items-center gap-4 text-[12px] font-semibold text-white/75 xl:flex">
            <a className="transition-colors hover:text-white" href="#network">The backbone</a>
            <a className="transition-colors hover:text-white" href="#ai-powered-exchange">AI powered</a>
            <a className="transition-colors hover:text-white" href="#features">Features</a>
            <a className="transition-colors hover:text-white" href="#revenue">Earn revenue</a>
            <a className="transition-colors hover:text-white" href="#how-it-works">How it works</a>
            <a className="transition-colors hover:text-white" href="#partners">Who it is for</a>
            <a className="transition-colors hover:text-white" href="#news">Breaking news</a>
            <a className="transition-colors hover:text-white" href="/data-room">Investor data room</a>
            <button onClick={goToRegistration} className="rounded-full bg-[#b7e44c] px-5 py-3 text-[#12352b] transition hover:bg-[#d1f37e]">Get your marketplace <ArrowRight className="ml-2 inline" size={15} /></button>
          </nav>
          <button className="grid size-11 place-items-center rounded-full border border-white/20 text-white xl:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
        {menuOpen && <nav className="mx-4 rounded-2xl border border-white/10 bg-[#0b3027]/95 p-5 text-sm text-white shadow-2xl xl:hidden"><div className="grid gap-4"><a href="#network" onClick={() => setMenuOpen(false)}>The backbone</a><a href="#ai-powered-exchange" onClick={() => setMenuOpen(false)}>AI powered</a><a href="#features" onClick={() => setMenuOpen(false)}>Features</a><a href="#revenue" onClick={() => setMenuOpen(false)}>Earn revenue</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><a href="#partners" onClick={() => setMenuOpen(false)}>Who it is for</a><a href="#news" onClick={() => setMenuOpen(false)}>Breaking news</a><a href="/data-room" onClick={() => setMenuOpen(false)}>Investor data room</a><button onClick={goToRegistration} className="rounded-full bg-[#b7e44c] px-4 py-3 font-bold text-[#12352b]">Get your marketplace</button></div></nav>}
      </header>

      <main id="top">
        <section className="relative min-h-[720px] overflow-hidden bg-[#092d25] pt-32 text-white lg:min-h-[790px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_25%,rgba(86,179,137,.18),transparent_30%),linear-gradient(115deg,#092d25_0%,#0b3b2d_45%,#092d25_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[72%] bg-cover bg-[position:center_top] bg-no-repeat opacity-45 mix-blend-screen" style={{ backgroundImage: `url(${mapImage})` }} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#092d25]/95 via-[#092d25]/55 to-[#092d25]/10" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#092d25] to-transparent" />
          <div className="absolute -bottom-24 left-[4%] size-72 rounded-full bg-[#b7e44c]/10 blur-3xl" />
          <div className="container relative z-10 grid gap-x-10 lg:grid-cols-[.98fr_1.02fr]">
            <div className="min-w-0 max-w-[640px] lg:col-start-1 lg:row-start-1 lg:self-center">
              <p className="exchange-hero-eyebrow">{messaging.hero.eyebrow}</p>
              <h1 className="exchange-hero-heading exchange-marketplace-heading">{messaging.hero.headline_lines.map((line) => <span key={line}>{line}{" "}</span>)}</h1>
              <p className="exchange-marketplace-subheadline">{messaging.hero.subheadline}</p>
              <ul className="exchange-hero-benefits" aria-label="Marketplace benefits">{messaging.hero.benefits.map(benefit => <li key={benefit}><Check size={13} aria-hidden="true" />{benefit}</li>)}</ul>
              <div className="mt-7 flex"><button onClick={goToRegistration} className="rounded-full bg-[#b7e44c] px-6 py-4 text-sm font-bold text-[#12352b] shadow-[0_12px_32px_rgba(183,228,76,.18)] transition hover:-translate-y-0.5 hover:bg-[#d1f37e]">{messaging.hero.cta} <ArrowRight className="ml-2 inline" size={16} /></button></div>
              <p className="exchange-hero-fee-note">{messaging.hero.fee_note}</p>
            </div>
            <div className="hero-partner-band mt-9 border-y border-white/10 py-4 lg:col-span-2 lg:row-start-2"><p className="mb-3 px-5 text-[9px] font-bold uppercase tracking-[.24em] text-white/38 sm:px-8 lg:px-14">Strategic platform partners</p><div className="partner-marquee" role="region" aria-label="Strategic platform partners"><div className="partner-marquee-track">{strategicPartnerRail.map((partner, index) => <div key={`${partner.name}-${index}`} className="partner-logo" aria-hidden={index >= strategicPartners.length}>{partner.src ? <img src={partner.src} alt={index < strategicPartners.length ? `${partner.name}, strategic platform partner` : ""} style={{ transform: `scale(${partner.scale})` }} /> : <span className="partner-text-mark" style={{ transform: `scale(${partner.scale})` }}>{partner.textMark}</span>}</div>)}</div></div></div>
            <div className="mt-6 grid grid-cols-3 items-start gap-2 pb-10 text-[10px] leading-4 text-white/55 sm:gap-6 sm:text-xs lg:col-start-1 lg:row-start-3 lg:pb-24"><span className="min-w-0 text-center"><b className="block font-display text-2xl text-white">14K</b>integrated Title Companies</span><span className="min-w-0 text-center"><b className="block font-display text-2xl text-white">21</b>Integrated Lenders</span><span className="min-w-0 text-center"><b className="block font-display text-2xl text-white">480</b>Connected Marketplaces</span></div>
            <div className="relative -mr-8 lg:col-start-2 lg:row-start-1 lg:-mr-24 lg:self-center"><div className="absolute inset-12 rounded-full bg-[#56b389]/20 blur-3xl" /><img src={heroImage} alt="Isolated laptop, desktop monitor, mobile phone, house models, and keys displaying a connected property marketplace" className="relative w-full object-contain drop-shadow-[0_30px_45px_rgba(0,0,0,.38)]" /></div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#f7f8f2] [clip-path:polygon(0_100%,100%_30%,100%_100%)]" />
        </section>

        <section className="container py-24 lg:py-28"><div className="relative overflow-hidden rounded-[34px] bg-[#dff0bf] px-7 py-14 md:px-14 lg:py-20"><div className="absolute -right-24 -top-24 size-72 rounded-full border-[45px] border-[#b7e44c]/50" /><div className="relative z-10 max-w-3xl"><p className="eyebrow text-[#2d7f58]">The opportunity</p><h2 className="font-display text-[clamp(2.8rem,5vw,5rem)] font-semibold leading-[.95] tracking-[-.06em] text-[#12352b]">Your Members are already buying and selling.<br /><span className="text-[#2d7f58]">Are you monetizing their transactions?</span></h2><p className="mt-6 max-w-xl text-lg leading-8 text-[#385b4c]">Connect your community to the backbone of a global real estate exchange. Use your existing marketplace or launch a free branded gateway, keep your relationships, and earn when your members complete transactions.</p><button onClick={goToRegistration} className="mt-8 rounded-full bg-[#12352b] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#205743]">Get your free marketplace <ArrowRight className="ml-2 inline" size={16} /></button></div></div></section>

        <section id="network" className="container py-24 lg:py-32">
          <div className="grid items-center gap-14 lg:grid-cols-[.85fr_1.15fr]">
            <div><p className="eyebrow">The network effect</p><h2 className="section-title">Many networks.<br /><em>One backbone.</em></h2><p className="mt-7 max-w-[540px] text-[16px] leading-7 text-[#52645c]">{messaging.network.intro}</p><p className="mt-4 max-w-[540px] text-[15px] leading-7 text-[#52645c]">{messaging.network.support}</p><div className="mt-8 grid gap-4">{tools.slice(0, 3).map((tool) => <div key={tool} className="flex items-start gap-3 text-sm font-semibold text-[#244b3c]"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#d8efb0] text-[#2d7f58]"><Check size={13} strokeWidth={3} /></span>{tool}</div>)}</div></div>
            <div className="relative mx-auto w-full max-w-[500px]"><div className="absolute -inset-5 rounded-[34px] bg-[#b7e44c]/20 blur-3xl" /><img src={networkImage} alt="Six real estate communities connected to a central global exchange, with lender, investor, and brokerage icons" className="relative w-full rounded-[30px] shadow-[0_22px_70px_rgba(25,70,50,.18)]" /><div className="absolute -bottom-5 -left-5 rounded-2xl bg-white p-4 shadow-xl"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#e5f5c8] text-[#2d7f58]"><Handshake size={20} /></span><span className="text-xs font-semibold text-[#385b4c]">Independent brands.<br /><b className="text-[#12352b]">One shared backbone.</b></span></div></div></div>
          </div>
          <div className="exchange-backbone-model" aria-labelledby="backbone-model-heading"><p className="eyebrow">{messaging.network.backbone.eyebrow}</p><h3 id="backbone-model-heading">{messaging.network.backbone.headline}</h3><p>{messaging.network.backbone.statement}</p><ol>{messaging.network.backbone.flow.map((step, index) => <li key={step.title} className={index === 1 ? "backbone-core" : undefined}><span>0{index + 1}</span><h4>{step.title}</h4><p>{step.text}</p></li>)}</ol></div>
          <div className="exchange-entry-paths" aria-label="Two ways to participate in one exchange">{messaging.network.paths.map((path, index) => { const Icon = index === 0 ? Globe2 : PlugZap; return <article key={path.title}><span className="exchange-entry-icon"><Icon size={23} aria-hidden="true" /></span><div><p className="eyebrow">{path.label}</p><h3>{path.title}</h3><p>{path.text}</p></div></article>; })}</div>
          <p className="exchange-inventory-note">{messaging.network.inventory_note}</p>
        </section>

        <AIPoweredExchange />

        <section id="features" className="bg-[#0b3027] py-20 text-white lg:py-24"><div className="container"><div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b7e44c]">Platform features</p><h2 className="mt-4 max-w-3xl font-display text-[clamp(2.7rem,4.6vw,4.8rem)] font-semibold leading-[.95] tracking-[-.055em]">The infrastructure behind your network. <span className="text-[#b7e44c]">One connected exchange.</span></h2></div><p className="max-w-md text-sm leading-6 text-white/60">A shared operating layer for independent networks: permitted opportunity, professional services, digital transactions, authorized AI-agent access, and partner revenue.</p></div><div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{featureGroups.map(({ title, icon: Icon, features }) => <article key={title} className="rounded-[24px] border border-white/10 bg-white/[.055] p-5 shadow-[0_16px_45px_rgba(0,0,0,.12)]"><div className="flex items-center gap-3 border-b border-white/10 pb-4"><span className="grid size-10 place-items-center rounded-xl bg-[#b7e44c] text-[#12352b]"><Icon size={19} strokeWidth={2.25} /></span><h3 className="font-display text-xl font-semibold tracking-[-.035em]">{title}</h3></div><div className="mt-4 grid gap-4">{features.map((feature) => <div key={feature.title} className="grid grid-cols-[14px_1fr] gap-2.5"><Check className="mt-0.5 text-[#b7e44c]" size={13} strokeWidth={3} /><div><h4 className="text-[13px] font-bold text-white">{feature.title}</h4><p className="mt-0.5 text-[11px] leading-[1.45] text-white/55">{feature.text}</p></div></div>)}</div></article>)}</div></div></section>

        <EarnRevenue />

        <section id="how-it-works" className="border-y border-[#dce6d7] bg-[#edf4e8] py-24 lg:py-28"><div className="container"><div className="max-w-2xl"><p className="eyebrow">TURN-KEY PLATFORM</p><h2 className="section-title">Your branded gateway.<br /><em>Our connected backbone.</em></h2></div><div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><div className="step-card"><span>01</span><h3>Register online</h3><p>Register your organization and marketplace details through a simple guided setup.</p></div><div className="step-card"><span>02</span><h3>Add Your Branding</h3><p>Customize your marketplace with your logo, colors, domain, and community identity.</p></div><div className="step-card"><span>03</span><h3>Invite Your community</h3><p>Invite your buyers, sellers, agents, investors, and members—and introduce authorized AI-agent access.</p></div><div className="step-card"><span>04</span><h3>Earn Monthly Revenue</h3><p>Earn a 20% share of transaction fees generated through your branded marketplace.</p></div></div><div className="mt-12 grid gap-7 rounded-[28px] bg-[#12352b] p-7 text-white lg:grid-cols-[1fr_auto] lg:items-center lg:p-10"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#b7e44c]">TURN-KEY MARKETPLACE, LIVE IN MINUTES</p><p className="mt-4 max-w-5xl text-[15px] font-medium leading-7 text-white/85">{messaging.turnkey.copy}</p></div><button onClick={goToRegistration} className="rounded-full bg-[#b7e44c] px-5 py-3 text-sm font-bold text-[#12352b] transition hover:bg-[#d1f37e]">Talk to the team <ArrowRight className="ml-2 inline" size={15} /></button></div></div></section>

        <section id="partners" className="container py-24 lg:py-32"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="eyebrow">Who can join</p><h2 className="section-title max-w-2xl">Keep your community.<br /><em>Connect to the backbone.</em></h2></div><p className="max-w-sm text-sm leading-6 text-[#62776b]">We connect marketplaces and networks rather than replace them. Your brand, clients, and community remain yours; the infrastructure expands your reach.</p></div><div className="mt-14 grid gap-4 sm:grid-cols-2">{partnerTypes.map((partner) => <article key={partner.title} className="group rounded-[24px] border border-[#dce6d7] bg-white p-6 transition hover:-translate-y-1 hover:border-[#b7e44c] hover:shadow-[0_18px_50px_rgba(25,70,50,.1)]"><div className="flex items-start justify-between"><span className="font-display text-4xl font-semibold tracking-[-.08em] text-[#b7d29d]">{partner.icon}</span><span className="grid size-10 place-items-center rounded-full bg-[#eff7df] text-[#2d7f58] transition group-hover:bg-[#b7e44c] group-hover:text-[#12352b]"><ArrowRight size={17} /></span></div><h3 className="mt-8 font-display text-2xl font-semibold tracking-[-.04em]">{partner.title}</h3><p className="mt-3 text-sm leading-6 text-[#64776c]">{partner.text}</p></article>)}</div></section>

        <section id="news" className="relative overflow-hidden border-t border-[#dce6d7] bg-[#eaf1e6] py-20 lg:py-24"><div className="pointer-events-none absolute -right-28 -top-28 size-80 rounded-full border-[52px] border-[#b7e44c]/35" /><div className="relative mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8"><div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-end"><div><p className="eyebrow">Company announcements</p><h2 className="section-title">Breaking<br /><em>news.</em></h2></div><p className="max-w-xl text-[16px] leading-7 text-[#5c7065]">Follow the latest milestones, strategic partnerships, and company growth announcements from Property Hub Exchange, Inc.</p></div><div className="mt-10 grid gap-3">{announcements.map((announcement, index) => <article key={announcement.id} className="group grid grid-cols-[92px_1fr] items-center gap-x-4 gap-y-2 rounded-[20px] border border-[#cfddca] bg-white px-4 py-3.5 shadow-[0_12px_38px_rgba(25,70,50,.065)] transition hover:-translate-y-0.5 hover:border-[#a9cb73] hover:shadow-[0_18px_48px_rgba(25,70,50,.1)] md:grid-cols-[145px_1fr_auto] md:gap-5 md:px-5 md:py-3"><div className="row-span-2 border-r border-[#dce6d7] pr-3 md:row-span-1 md:pr-5"><span className="inline-flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[.14em] text-[#2d7f58]"><CalendarDays size={11} />{index === 0 ? "Latest" : "News"}</span><time dateTime={announcement.date} className="mt-1.5 block font-display text-sm font-semibold leading-tight tracking-[-.025em] text-[#12352b]">{announcement.displayDate}</time></div><div><h3 className="max-w-4xl font-display text-[clamp(.98rem,1.65vw,1.38rem)] font-semibold leading-[1.08] tracking-[-.035em] text-[#12352b]">{announcement.headline}</h3><p className="mt-1 hidden max-w-4xl text-[11px] leading-4 text-[#687a70] lg:block">{announcement.summary}</p></div><button onClick={() => setActiveAnnouncement(announcement)} className="inline-flex w-fit items-center justify-center rounded-full bg-[#12352b] px-3.5 py-2 text-[11px] font-bold text-white transition hover:bg-[#205743]">Read more <ArrowRight className="ml-1.5" size={12} /></button></article>)}</div></div></section>

        <ExecutiveTeam />
      </main>

      <footer className="bg-[#092d25] py-10 text-white"><div className="container grid gap-7 text-sm md:grid-cols-[auto_1fr_auto] md:items-start"><a href="#top" className="inline-flex w-fit shrink-0 items-center rounded-full bg-white px-5 py-3 shadow-[0_8px_24px_rgba(0,0,0,.14)]" aria-label="Property Hub Exchange home"><img src={logoImage} alt="Property Hub Exchange" width={1200} height={410} className="h-9 w-auto max-w-full shrink-0 object-contain" /></a><p className="text-white/45 md:text-center">Owned and operated by Property Hub Exchange, Inc.<br /><a className="mt-2 inline-block font-semibold text-[#d4e7ca] transition-colors hover:text-white" href="/data-room">Investor Data Room</a></p><div className="space-y-1.5 text-white/45 md:text-right"><p>© 2026 Property Hub Exchange, Inc.</p><address className="not-italic"><p>8 The Green, Suite A</p><p>Dover, Delaware 19901</p></address><p><a className="transition-colors hover:text-white" href="tel:+19412072090">941-207-2090</a></p><p><a className="transition-colors hover:text-white" href="mailto:platform@propertysource.app">platform@propertysource.app</a></p></div></div></footer>

      {showForm && <div className="fixed inset-0 z-50 grid place-items-center bg-[#051a15]/70 p-4 backdrop-blur-sm"><div className="relative w-full max-w-lg rounded-[28px] bg-[#f7f8f2] p-7 shadow-2xl md:p-10"><button onClick={() => setShowForm(false)} className="absolute right-5 top-5 grid size-9 place-items-center rounded-full bg-[#e8eee3] text-[#12352b]" aria-label="Close form"><X size={18} /></button><p className="eyebrow">Start the conversation</p><h2 className="mt-3 font-display text-4xl font-semibold leading-none tracking-[-.05em]">Build your marketplace.</h2><p className="mt-4 text-sm leading-6 text-[#62776b]">Tell us a little about your community and we’ll show you how quickly you can connect.</p><form onSubmit={submitForm} className="mt-7 grid gap-4"><input required placeholder="Your name" className="rounded-xl border border-[#d7e1d3] bg-white px-4 py-3 outline-none focus:border-[#2d7f58]" /><input required type="email" placeholder="Work email" className="rounded-xl border border-[#d7e1d3] bg-white px-4 py-3 outline-none focus:border-[#2d7f58]" /><select className="rounded-xl border border-[#d7e1d3] bg-white px-4 py-3 text-[#52645c] outline-none focus:border-[#2d7f58]" defaultValue=""><option value="" disabled>What best describes you?</option><option>Real estate community</option><option>Lender or lending broker</option><option>Influencer or coach</option><option>Asset manager</option><option>Brokerage</option></select><button type="submit" className="mt-2 rounded-full bg-[#12352b] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#205743]">Request a marketplace walkthrough <ArrowRight className="ml-2 inline" size={16} /></button></form></div></div>}

      <Dialog open={Boolean(activeAnnouncement)} onOpenChange={(open) => !open && setActiveAnnouncement(null)}><DialogContent showCloseButton={false} className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-[28px] border-0 bg-[#f7f8f2] p-0 text-[#12352b] shadow-[0_32px_100px_rgba(4,25,20,.35)]"><DialogHeader className="relative bg-[#0b3027] px-7 py-5 pr-28 text-left text-white md:px-10 md:py-6 md:pr-32"><DialogClose asChild><button type="button" className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-white hover:text-[#12352b] focus:outline-none focus:ring-2 focus:ring-[#b7e44c] focus:ring-offset-2 focus:ring-offset-[#0b3027]" aria-label="Close press release"><X size={14} strokeWidth={2.5} /><span>Close</span></button></DialogClose><div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.17em] text-[#b7e44c]"><Newspaper size={14} />Press release</div><DialogTitle className="mt-2.5 font-display text-[clamp(1.55rem,3vw,2.5rem)] font-semibold leading-[1.02] tracking-[-.045em] text-white">{activeAnnouncement?.headline}</DialogTitle><DialogDescription className="mt-2 text-xs text-white/60">{activeAnnouncement?.displayDate} · Property Hub Exchange, Inc.</DialogDescription></DialogHeader><div className="px-7 py-8 md:px-12 md:py-10"><div className="border-b border-[#d7e3d2] pb-6"><p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#2d7f58]">For immediate release</p><p className="mt-3 text-sm leading-6 text-[#63766b]">Dover, Delaware — {activeAnnouncement?.displayDate}</p></div><div className="mt-8 rounded-[22px] border border-dashed border-[#b8cdb1] bg-[#eef4e9] px-6 py-12 text-center md:px-12"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white text-[#2d7f58] shadow-sm"><FileCheck2 size={22} /></span><h3 className="mt-5 font-display text-2xl font-semibold tracking-[-.04em]">Press release document forthcoming</h3><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#697c71]">The official release content is being prepared and will be published in this document window when complete.</p></div><div className="mt-8 flex flex-col justify-between gap-4 border-t border-[#d7e3d2] pt-6 text-xs text-[#718178] sm:flex-row"><span>Media contact: platform@propertysource.app</span><span>Property Hub Exchange, Inc.</span></div></div></DialogContent></Dialog>
    </div>
  );
}
