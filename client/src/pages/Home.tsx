import { useState } from "react";
import { ArrowRight, BarChart3, Check, DollarSign, FileCheck2, Globe2, Handshake, Megaphone, Menu, Repeat2, Search, Settings2, X } from "lucide-react";
import { toast } from "sonner";

const heroImage = "/manus-storage/property-source-devices-transparent_ae62f96f.png";
const networkImage = "/manus-storage/property-source-network-portrait_06fc6b61.png";
const mapImage = "/manus-storage/property-source-world-map_d3b0c44e.png";
const logoImage = "/manus-storage/Property_Source_Logo_Green_b7a58ad8.png";
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
  { name: "D1 Funds", src: "/manus-storage/d1-funds-white_b42b5051.png", scale: 1.75 },
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
  { icon: "01", title: "Real estate communities", text: "Give your members a branded marketplace without rebuilding your business from scratch." },
  { icon: "02", title: "Lenders & brokers", text: "Turn every borrower relationship into a connected buying and selling channel." },
  { icon: "03", title: "Influencers & educators", text: "Put your audience inside a marketplace they can actually transact on." },
  { icon: "04", title: "Asset managers", text: "Launch a white-label auction marketplace built for defaulted and investment assets." },
];

const tools = [
  "Aggregated property listings from connected communities",
  "Built-in offer, contract, and negotiation workflows",
  "Digital handoff to connected title and closing providers",
  "Embedded lenders, insurance, inspections, and service partners",
];

const featureGroups = [
  {
    title: "Marketplace Network",
    icon: Globe2,
    features: [
      { title: "Turnkey White-Label", text: "Launch with your domain, logo, colors, and branded registration." },
      { title: "Two-Way API Connection", text: "Connect an existing marketplace through synchronized data integrations." },
      { title: "Aggregated Global Inventory", text: "Share real-time listings across every connected independent marketplace." },
      { title: "Single Sign-On", text: "Give members one login for a worldwide view of deals." },
      { title: "Multiple Asset Types", text: "Support residential, multifamily, commercial, industrial, land, and mortgage notes." },
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

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const openForm = () => setShowForm(true);
  const goToRegistration = () => { window.open(registrationUrl, "_blank", "noopener,noreferrer"); };
  const submitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowForm(false);
    toast.success("Thanks — your marketplace conversation request is ready.", { description: "A Property Source Exchange team member will be in touch." });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f8f2] text-[#12352b]">
      <header className="absolute inset-x-0 top-0 z-40">
        <div className="container flex items-center justify-between py-5">
          <a href="#top" className="flex items-center" aria-label="Property Source Exchange home">
            <span className="inline-flex items-center rounded-full bg-white px-4 py-2 shadow-[0_8px_24px_rgba(0,0,0,.16)]"><img src={logoImage} alt="Property Source Exchange" className="h-9 w-auto" /></span>
          </a>
          <nav className="hidden items-center gap-8 text-[13px] font-semibold text-white/75 md:flex">
            <a className="transition-colors hover:text-white" href="#network">The network</a>
            <a className="transition-colors hover:text-white" href="#features">Features</a>
            <a className="transition-colors hover:text-white" href="#revenue">Earn revenue</a>
            <a className="transition-colors hover:text-white" href="#how-it-works">How it works</a>
            <a className="transition-colors hover:text-white" href="#partners">Who it is for</a>
            <button onClick={goToRegistration} className="rounded-full bg-[#b7e44c] px-5 py-3 text-[#12352b] transition hover:bg-[#d1f37e]">Get your marketplace <ArrowRight className="ml-2 inline" size={15} /></button>
          </nav>
          <button className="grid size-11 place-items-center rounded-full border border-white/20 text-white md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
        {menuOpen && <nav className="mx-4 rounded-2xl border border-white/10 bg-[#0b3027]/95 p-5 text-sm text-white shadow-2xl md:hidden"><div className="grid gap-4"><a href="#network" onClick={() => setMenuOpen(false)}>The network</a><a href="#features" onClick={() => setMenuOpen(false)}>Features</a><a href="#revenue" onClick={() => setMenuOpen(false)}>Earn revenue</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><a href="#partners" onClick={() => setMenuOpen(false)}>Who it is for</a><button onClick={goToRegistration} className="rounded-full bg-[#b7e44c] px-4 py-3 font-bold text-[#12352b]">Get your marketplace</button></div></nav>}
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
              <h1 className="font-display text-[clamp(3.3rem,6.2vw,6.2rem)] font-semibold leading-[.92] tracking-[-.065em]">Create your marketplace.<span className="mt-4 block text-[clamp(1.1rem,2.35vw,2.1rem)] leading-tight tracking-[-.035em] text-[#b7e44c]"><span className="block whitespace-nowrap">Give your Members access</span><span className="mt-1 block whitespace-nowrap">to property deals around the world</span></span></h1>
              <p className="mt-7 max-w-[560px] text-[16px] leading-7 text-white/70">Go live today with a free, turnkey real estate marketplace featuring a custom domain name and branding tailored to your community. Pay zero setup fees and zero monthly costs—and, best of all, earn 20% of every transaction fee generated through your marketplace. We provide and manage the infrastructure; you only need to promote your marketplace to your community. Your marketplace will display every on-market and off-market listing posted to the platform by every connected marketplace. You can also offer 50-state live auctions directly from your marketplace—all while earning a 20% revenue share on every transaction.</p>
              <div className="mt-9 flex"><button onClick={goToRegistration} className="rounded-full bg-[#b7e44c] px-6 py-4 text-sm font-bold text-[#12352b] shadow-[0_12px_32px_rgba(183,228,76,.18)] transition hover:-translate-y-0.5 hover:bg-[#d1f37e]">Set up your free marketplace <ArrowRight className="ml-2 inline" size={16} /></button></div>
            </div>
            <div className="hero-partner-band mt-9 border-y border-white/10 py-4 lg:col-span-2 lg:row-start-2"><p className="mb-3 px-5 text-[9px] font-bold uppercase tracking-[.24em] text-white/38 sm:px-8 lg:px-14">Strategic platform partners</p><div className="partner-marquee" role="region" aria-label="Strategic platform partners"><div className="partner-marquee-track">{strategicPartnerRail.map((partner, index) => <div key={`${partner.name}-${index}`} className="partner-logo" aria-hidden={index >= strategicPartners.length}>{partner.src ? <img src={partner.src} alt={index < strategicPartners.length ? `${partner.name}, strategic platform partner` : ""} style={{ transform: `scale(${partner.scale})` }} /> : <span className="partner-text-mark" style={{ transform: `scale(${partner.scale})` }}>{partner.textMark}</span>}</div>)}</div></div></div>
            <div className="mt-6 grid grid-cols-3 items-start gap-2 pb-10 text-[10px] leading-4 text-white/55 sm:gap-6 sm:text-xs lg:col-start-1 lg:row-start-3 lg:pb-24"><span className="min-w-0 text-center"><b className="block font-display text-2xl text-white">14K</b>integrated Title Companies</span><span className="min-w-0 text-center"><b className="block font-display text-2xl text-white">21</b>Integrated Lenders</span><span className="min-w-0 text-center"><b className="block font-display text-2xl text-white">480</b>Connected Marketplaces</span></div>
            <div className="relative -mr-8 lg:col-start-2 lg:row-start-1 lg:-mr-24 lg:self-center"><div className="absolute inset-12 rounded-full bg-[#56b389]/20 blur-3xl" /><img src={heroImage} alt="Isolated laptop, desktop monitor, mobile phone, house models, and keys displaying a connected property marketplace" className="relative w-full object-contain drop-shadow-[0_30px_45px_rgba(0,0,0,.38)]" /></div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#f7f8f2] [clip-path:polygon(0_100%,100%_30%,100%_100%)]" />
        </section>

        <section className="container py-24 lg:py-28"><div className="relative overflow-hidden rounded-[34px] bg-[#dff0bf] px-7 py-14 md:px-14 lg:py-20"><div className="absolute -right-24 -top-24 size-72 rounded-full border-[45px] border-[#b7e44c]/50" /><div className="relative z-10 max-w-3xl"><p className="eyebrow text-[#2d7f58]">The opportunity</p><h2 className="font-display text-[clamp(2.8rem,5vw,5rem)] font-semibold leading-[.95] tracking-[-.06em] text-[#12352b]">Your Members are already buying and selling.<br /><span className="text-[#2d7f58]">Are you monetizing their transactions?</span></h2><p className="mt-6 max-w-xl text-lg leading-8 text-[#385b4c]">Launch your free white-label marketplace and make your community part of the global real estate exchange.</p><button onClick={goToRegistration} className="mt-8 rounded-full bg-[#12352b] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#205743]">Get your free marketplace <ArrowRight className="ml-2 inline" size={16} /></button></div></div></section>

        <section id="network" className="container py-24 lg:py-32"><div className="grid items-center gap-14 lg:grid-cols-[.85fr_1.15fr]"><div><p className="eyebrow">The network effect</p><h2 className="section-title">One hub.<br /><em>Thousands</em> of marketplaces.</h2><p className="mt-7 max-w-[540px] text-[16px] leading-7 text-[#52645c]">Property Source Exchange transforms industry fragmentation into a unified global powerhouse. By instantly bridging hundreds of independent real estate communities, brokerages, investors, and marketplaces worldwide, we fuse thousands of isolated networks into a single, seamless ecosystem. Joining this global exchange means your inventory instantly scales across the entire network, backed by immediate access to digitally connected lenders, title companies, and essential transaction resources. It is the ultimate real estate super-hub, giving independent marketplaces the global reach and shared infrastructure to operate as one interconnected network.</p><div className="mt-8 grid gap-4">{tools.slice(0, 3).map((tool) => <div key={tool} className="flex items-start gap-3 text-sm font-semibold text-[#244b3c]"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#d8efb0] text-[#2d7f58]"><Check size={13} strokeWidth={3} /></span>{tool}</div>)}</div></div><div className="relative mx-auto w-full max-w-[500px]"><div className="absolute -inset-5 rounded-[34px] bg-[#b7e44c]/20 blur-3xl" /><img src={networkImage} alt="Six real estate communities connected to a central global exchange, with lender, investor, and brokerage icons" className="relative w-full rounded-[30px] shadow-[0_22px_70px_rgba(25,70,50,.18)]" /><div className="absolute -bottom-5 -left-5 rounded-2xl bg-white p-4 shadow-xl"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#e5f5c8] text-[#2d7f58]"><Handshake size={20} /></span><span className="text-xs font-semibold text-[#385b4c]">Independent brands.<br /><b className="text-[#12352b]">Shared global reach.</b></span></div></div></div></div></section>

        <section id="features" className="bg-[#0b3027] py-20 text-white lg:py-24"><div className="container"><div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#b7e44c]">Platform features</p><h2 className="mt-4 max-w-3xl font-display text-[clamp(2.7rem,4.6vw,4.8rem)] font-semibold leading-[.95] tracking-[-.055em]">Everything your marketplace needs. <span className="text-[#b7e44c]">One connected platform.</span></h2></div><p className="max-w-md text-sm leading-6 text-white/60">From marketplace launch and global discovery to digital closing and recurring partner revenue—all in one managed ecosystem.</p></div><div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{featureGroups.map(({ title, icon: Icon, features }) => <article key={title} className="rounded-[24px] border border-white/10 bg-white/[.055] p-5 shadow-[0_16px_45px_rgba(0,0,0,.12)]"><div className="flex items-center gap-3 border-b border-white/10 pb-4"><span className="grid size-10 place-items-center rounded-xl bg-[#b7e44c] text-[#12352b]"><Icon size={19} strokeWidth={2.25} /></span><h3 className="font-display text-xl font-semibold tracking-[-.035em]">{title}</h3></div><div className="mt-4 grid gap-4">{features.map((feature) => <div key={feature.title} className="grid grid-cols-[14px_1fr] gap-2.5"><Check className="mt-0.5 text-[#b7e44c]" size={13} strokeWidth={3} /><div><h4 className="text-[13px] font-bold text-white">{feature.title}</h4><p className="mt-0.5 text-[11px] leading-[1.45] text-white/55">{feature.text}</p></div></div>)}</div></article>)}</div></div></section>

        <section id="revenue" className="relative overflow-hidden bg-[#f7f8f2] py-24 lg:py-28"><div className="pointer-events-none absolute -right-32 top-16 size-[420px] rounded-full border-[70px] border-[#dff0bf]/65" /><div className="container relative"><div className="grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-end"><div><p className="eyebrow">Earn revenue</p><h2 className="section-title max-w-4xl">Your network is already transacting. <em>Own the marketplace economics.</em></h2></div><div className="rounded-[24px] bg-[#dff0bf] p-6 text-[#12352b]"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#2d7f58]">Launch with no financial risk</p><p className="mt-3 font-display text-2xl font-semibold leading-tight tracking-[-.035em]">$0 setup. $0 monthly. $0 out of pocket.</p><p className="mt-3 text-sm leading-6 text-[#496557]">The complete turnkey marketplace is provided through a revenue-share model—not a subscription.</p></div></div><p className="mt-8 max-w-4xl text-[17px] leading-8 text-[#52645c]">Turn the buying and selling activity already happening inside your community into an evergreen revenue stream. Property Source Exchange supplies and manages the technology, transaction infrastructure, and digital services. You bring the audience—and retain a permanent share of qualifying transaction fees generated through your branded marketplace.</p><div className="mt-12 grid gap-5 lg:grid-cols-3"><article className="group rounded-[28px] border border-[#d8e5d5] bg-white p-7 shadow-[0_18px_55px_rgba(25,70,50,.08)] transition hover:-translate-y-1 hover:shadow-[0_22px_65px_rgba(25,70,50,.13)]"><div className="flex items-start justify-between"><span className="grid size-12 place-items-center rounded-2xl bg-[#12352b] text-[#b7e44c]"><DollarSign size={23} /></span><span className="rounded-full bg-[#eff7df] px-3 py-1 text-xs font-bold text-[#2d7f58]">20% SHARE</span></div><p className="mt-8 text-xs font-bold uppercase tracking-[.16em] text-[#718379]">Buyer transaction</p><div className="mt-2 flex items-end gap-3"><strong className="font-display text-5xl tracking-[-.06em] text-[#12352b]">$300</strong><span className="pb-1 text-sm font-semibold text-[#5f7368]">to the Marketplace</span></div><p className="mt-4 text-sm leading-6 text-[#63766b]">Buyers pay a $1,500 technology fee covering offer tools, transaction coordination, management, infrastructure, and digital purchase services.</p></article><article className="group rounded-[28px] border border-[#d8e5d5] bg-white p-7 shadow-[0_18px_55px_rgba(25,70,50,.08)] transition hover:-translate-y-1 hover:shadow-[0_22px_65px_rgba(25,70,50,.13)]"><div className="flex items-start justify-between"><span className="grid size-12 place-items-center rounded-2xl bg-[#12352b] text-[#b7e44c]"><Repeat2 size={23} /></span><span className="rounded-full bg-[#eff7df] px-3 py-1 text-xs font-bold text-[#2d7f58]">20% SHARE</span></div><p className="mt-8 text-xs font-bold uppercase tracking-[.16em] text-[#718379]">Seller transaction</p><div className="mt-2 flex items-end gap-3"><strong className="font-display text-5xl tracking-[-.06em] text-[#12352b]">$100</strong><span className="pb-1 text-sm font-semibold text-[#5f7368]">to the Marketplace</span></div><p className="mt-4 text-sm leading-6 text-[#63766b]">Sellers may list unlimited properties. The $500 technology fee covers property data, comparable sales, portfolio, contract, and e-signature tools; it is paid at settlement and disbursed directly by the title company.</p></article><article className="group rounded-[28px] bg-[#12352b] p-7 text-white shadow-[0_20px_60px_rgba(18,53,43,.2)] transition hover:-translate-y-1"><div className="flex items-start justify-between"><span className="grid size-12 place-items-center rounded-2xl bg-[#b7e44c] text-[#12352b]"><Megaphone size={23} /></span><span className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-[#b7e44c]">YOU KEEP 100%</span></div><p className="mt-8 text-xs font-bold uppercase tracking-[.16em] text-white/50">Advertising income</p><div className="mt-2 font-display text-4xl font-semibold leading-none tracking-[-.055em]">Unlimited banners.<br /><span className="text-[#b7e44c]">Unlimited upside.</span></div><p className="mt-5 text-sm leading-6 text-white/65">Sell banner placements or connect affiliate programs throughout your marketplace. Add unlimited advertisements and retain complete control with no platform revenue share.</p></article></div><div className="mt-6 grid gap-5 rounded-[28px] border border-[#cfe0c9] bg-[#edf4e8] p-7 md:grid-cols-[1fr_auto] md:items-center lg:p-9"><div className="flex gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-[#2d7f58] shadow-sm"><BarChart3 size={23} /></span><div><h3 className="font-display text-2xl font-semibold tracking-[-.04em]">Tracked. Visible. Auditable. Evergreen.</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-[#5d7166]">Every buyer fee, seller fee, settlement, and marketplace payment is tracked by the platform and visible from your owner dashboard. Your 20% participation continues on qualifying transactions generated by your network.</p></div></div><button onClick={goToRegistration} className="rounded-full bg-[#12352b] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#205743]">Start earning <ArrowRight className="ml-2 inline" size={16} /></button></div></div></section>

        <section id="how-it-works" className="border-y border-[#dce6d7] bg-[#edf4e8] py-24 lg:py-28"><div className="container"><div className="max-w-2xl"><p className="eyebrow">TURN-KEY PLATFORM</p><h2 className="section-title">Activate your Marketplace.<br /><em>Scale with the network.</em></h2></div><div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><div className="step-card"><span>01</span><h3>Register online</h3><p>Register your organization and marketplace details through a simple guided setup.</p></div><div className="step-card"><span>02</span><h3>Add Your Branding</h3><p>Customize your marketplace with your logo, colors, domain, and community identity.</p></div><div className="step-card"><span>03</span><h3>Invite Your community</h3><p>Share your marketplace with your buyers, sellers, investors, borrowers, and members.</p></div><div className="step-card"><span>04</span><h3>Earn Monthly Revenue</h3><p>Earn a 20% share of transaction fees generated through your branded marketplace.</p></div></div><div className="mt-12 grid gap-7 rounded-[28px] bg-[#12352b] p-7 text-white lg:grid-cols-[1fr_auto] lg:items-center lg:p-10"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#b7e44c]">TURN-KEY MARKETPLACE, LIVE IN MINUTES</p><p className="mt-4 max-w-5xl text-[15px] font-medium leading-7 text-white/85">Launch your branded real estate powerhouse in minutes—100% free, with zero technical skills required. Property Source Exchange delivers a fully template-based, turnkey white-label marketplace that deploys autonomously within an hour with no credit card needed. By simply picking your preferences from an intuitive dashboard, uploading your logos, and selecting your color scheme, you instantly transform your network into an active global exchange—no coding or web development experience necessary. Your members gain a seamless, credit-card-free portal to trade and collaborate, while you enjoy a lucrative 20% revenue share from every transaction fee generated. Best of all, you retain total management control: update your settings instantly anytime through your marketplace owner dashboard, choose to promote your own lending services exclusively, or hand-pick from our active lender network to perfectly curate your ecosystem.</p></div><button onClick={goToRegistration} className="rounded-full bg-[#b7e44c] px-5 py-3 text-sm font-bold text-[#12352b] transition hover:bg-[#d1f37e]">Talk to the team <ArrowRight className="ml-2 inline" size={15} /></button></div></div></section>

        <section id="partners" className="container py-24 lg:py-32"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="eyebrow">Who can join</p><h2 className="section-title max-w-2xl">If you have a community,<br /><em>you have a marketplace.</em></h2></div><p className="max-w-sm text-sm leading-6 text-[#62776b]">Every partner keeps their identity while gaining access to an exchange much larger than any one marketplace.</p></div><div className="mt-14 grid gap-4 sm:grid-cols-2">{partnerTypes.map((partner) => <article key={partner.title} className="group rounded-[24px] border border-[#dce6d7] bg-white p-6 transition hover:-translate-y-1 hover:border-[#b7e44c] hover:shadow-[0_18px_50px_rgba(25,70,50,.1)]"><div className="flex items-start justify-between"><span className="font-display text-4xl font-semibold tracking-[-.08em] text-[#b7d29d]">{partner.icon}</span><span className="grid size-10 place-items-center rounded-full bg-[#eff7df] text-[#2d7f58] transition group-hover:bg-[#b7e44c] group-hover:text-[#12352b]"><ArrowRight size={17} /></span></div><h3 className="mt-8 font-display text-2xl font-semibold tracking-[-.04em]">{partner.title}</h3><p className="mt-3 text-sm leading-6 text-[#64776c]">{partner.text}</p></article>)}</div></section>

        
      </main>

      <footer className="bg-[#092d25] py-10 text-white"><div className="container grid gap-7 text-sm md:grid-cols-[auto_1fr_auto] md:items-start"><a href="#top" className="inline-flex w-fit items-center rounded-full bg-white px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,.14)]" aria-label="Property Source Exchange home"><img src={logoImage} alt="Property Source Exchange" className="h-7 w-auto" /></a><p className="text-white/45 md:text-center">Owned and operated by Property Hub Exchange, Inc.</p><div className="space-y-1.5 text-white/45 md:text-right"><p>© 2026 Property Hub Exchange, Inc.</p><address className="not-italic"><p>8 The Green, Suite A</p><p>Dover, Delaware 19901</p></address><p><a className="transition-colors hover:text-white" href="tel:+19412072090">941-207-2090</a></p><p><a className="transition-colors hover:text-white" href="mailto:platform@propertysource.app">platform@propertysource.app</a></p></div></div></footer>

      {showForm && <div className="fixed inset-0 z-50 grid place-items-center bg-[#051a15]/70 p-4 backdrop-blur-sm"><div className="relative w-full max-w-lg rounded-[28px] bg-[#f7f8f2] p-7 shadow-2xl md:p-10"><button onClick={() => setShowForm(false)} className="absolute right-5 top-5 grid size-9 place-items-center rounded-full bg-[#e8eee3] text-[#12352b]" aria-label="Close form"><X size={18} /></button><p className="eyebrow">Start the conversation</p><h2 className="mt-3 font-display text-4xl font-semibold leading-none tracking-[-.05em]">Build your marketplace.</h2><p className="mt-4 text-sm leading-6 text-[#62776b]">Tell us a little about your community and we’ll show you how quickly you can connect.</p><form onSubmit={submitForm} className="mt-7 grid gap-4"><input required placeholder="Your name" className="rounded-xl border border-[#d7e1d3] bg-white px-4 py-3 outline-none focus:border-[#2d7f58]" /><input required type="email" placeholder="Work email" className="rounded-xl border border-[#d7e1d3] bg-white px-4 py-3 outline-none focus:border-[#2d7f58]" /><select className="rounded-xl border border-[#d7e1d3] bg-white px-4 py-3 text-[#52645c] outline-none focus:border-[#2d7f58]" defaultValue=""><option value="" disabled>What best describes you?</option><option>Real estate community</option><option>Lender or lending broker</option><option>Influencer or coach</option><option>Asset manager</option><option>Brokerage</option></select><button type="submit" className="mt-2 rounded-full bg-[#12352b] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#205743]">Request a marketplace walkthrough <ArrowRight className="ml-2 inline" size={16} /></button></form></div></div>}
    </div>
  );
}
