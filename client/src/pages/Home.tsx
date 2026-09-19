import { useState } from "react";
import { ArrowRight, Check, ChevronDown, Handshake, Menu, Network, X } from "lucide-react";
import { toast } from "sonner";

const heroImage = "/manus-storage/property-source-devices-transparent_ae62f96f.png";
const networkImage = "/manus-storage/property-source-network_538c191d.png";
const mapImage = "/manus-storage/property-source-world-map_d3b0c44e.png";
const logoImage = "/manus-storage/Property_Source_Logo_Green_b7a58ad8.png";
const registrationUrl = "https://app.propertysource.app/register";

const partnerTypes = [
  { icon: "01", title: "Real estate communities", text: "Give your members a branded marketplace without rebuilding your business from scratch." },
  { icon: "02", title: "Lenders & brokers", text: "Turn every borrower relationship into a connected buying and selling channel." },
  { icon: "03", title: "Influencers & educators", text: "Put your audience inside a marketplace they can actually transact on." },
  { icon: "04", title: "Asset managers", text: "Launch a white-label auction marketplace built for defaulted and investment assets." },
];

const tools = [
  "Curated property listings from connected communities",
  "Built-in offer, contract, and negotiation workflows",
  "Digital handoff to connected title and closing providers",
  "Embedded lenders, insurance, inspections, and service partners",
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
            <a className="transition-colors hover:text-white" href="#how-it-works">How it works</a>
            <a className="transition-colors hover:text-white" href="#partners">Who it is for</a>
            <button onClick={goToRegistration} className="rounded-full bg-[#b7e44c] px-5 py-3 text-[#12352b] transition hover:bg-[#d1f37e]">Get your marketplace <ArrowRight className="ml-2 inline" size={15} /></button>
          </nav>
          <button className="grid size-11 place-items-center rounded-full border border-white/20 text-white md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
        {menuOpen && <nav className="mx-4 rounded-2xl border border-white/10 bg-[#0b3027]/95 p-5 text-sm text-white shadow-2xl md:hidden"><div className="grid gap-4"><a href="#network" onClick={() => setMenuOpen(false)}>The network</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><a href="#partners" onClick={() => setMenuOpen(false)}>Who it is for</a><button onClick={goToRegistration} className="rounded-full bg-[#b7e44c] px-4 py-3 font-bold text-[#12352b]">Get your marketplace</button></div></nav>}
      </header>

      <main id="top">
        <section className="relative min-h-[720px] overflow-hidden bg-[#092d25] pt-32 text-white lg:min-h-[790px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_25%,rgba(86,179,137,.18),transparent_30%),linear-gradient(115deg,#092d25_0%,#0b3b2d_45%,#092d25_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[72%] bg-cover bg-[position:center_top] bg-no-repeat opacity-45 mix-blend-screen" style={{ backgroundImage: `url(${mapImage})` }} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#092d25]/95 via-[#092d25]/55 to-[#092d25]/10" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#092d25] to-transparent" />
          <div className="absolute -bottom-24 left-[4%] size-72 rounded-full bg-[#b7e44c]/10 blur-3xl" />
          <div className="container relative z-10 grid items-center gap-10 lg:grid-cols-[.98fr_1.02fr]">
            <div className="max-w-[640px] pb-10 lg:pb-24">
              <h1 className="font-display text-[clamp(3.3rem,6.2vw,6.2rem)] font-semibold leading-[.92] tracking-[-.065em]">Create your marketplace.<span className="mt-4 block whitespace-nowrap text-[clamp(1.55rem,3.1vw,2.9rem)] leading-none tracking-[-.045em] text-[#b7e44c]">Give your Members access.</span></h1>
              <p className="mt-7 max-w-[470px] text-lg leading-8 text-white/70">Launch a free, white-label real estate marketplace for your community — and connect your members to a global exchange hub built for direct transactions.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row"><button onClick={goToRegistration} className="rounded-full bg-[#b7e44c] px-6 py-4 text-sm font-bold text-[#12352b] shadow-[0_12px_32px_rgba(183,228,76,.18)] transition hover:-translate-y-0.5 hover:bg-[#d1f37e]">Set up your free marketplace <ArrowRight className="ml-2 inline" size={16} /></button><a href="#how-it-works" className="rounded-full border border-white/20 px-6 py-4 text-center text-sm font-bold text-white transition hover:border-white/50">See how it works <ChevronDown className="ml-2 inline" size={16} /></a></div>
              <div className="mt-12 flex items-center gap-8 border-t border-white/10 pt-6 text-xs text-white/55"><span><b className="block font-display text-2xl text-white">$0</b>to launch</span><span><b className="block font-display text-2xl text-white">1</b>connected hub</span><span><b className="block font-display text-2xl text-white">∞</b>marketplace reach</span></div>
            </div>
            <div className="relative -mr-8 lg:-mr-24"><div className="absolute inset-12 rounded-full bg-[#56b389]/20 blur-3xl" /><img src={heroImage} alt="Isolated laptop, desktop monitor, mobile phone, house models, and keys displaying a connected property marketplace" className="relative w-full object-contain drop-shadow-[0_30px_45px_rgba(0,0,0,.38)]" /></div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#f7f8f2] [clip-path:polygon(0_100%,100%_30%,100%_100%)]" />
        </section>

        <section className="container py-24 lg:py-28"><div className="relative overflow-hidden rounded-[34px] bg-[#dff0bf] px-7 py-14 md:px-14 lg:py-20"><div className="absolute -right-24 -top-24 size-72 rounded-full border-[45px] border-[#b7e44c]/50" /><div className="relative z-10 max-w-3xl"><p className="eyebrow text-[#2d7f58]">The opportunity</p><h2 className="font-display text-[clamp(2.8rem,5vw,5rem)] font-semibold leading-[.95] tracking-[-.06em] text-[#12352b]">Your Members are already buying and selling.<br /><span className="text-[#2d7f58]">Give them somewhere to go.</span></h2><p className="mt-6 max-w-xl text-lg leading-8 text-[#385b4c]">Launch your free white-label marketplace and make your community part of the global real estate exchange.</p><button onClick={goToRegistration} className="mt-8 rounded-full bg-[#12352b] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#205743]">Get your free marketplace <ArrowRight className="ml-2 inline" size={16} /></button></div></div></section>

        <section id="network" className="container py-24 lg:py-32"><div className="grid items-center gap-14 lg:grid-cols-[.85fr_1.15fr]"><div><p className="eyebrow">The network effect</p><h2 className="section-title">One hub.<br /><em>Thousands</em> of marketplaces.</h2><p className="mt-7 max-w-[500px] text-[17px] leading-8 text-[#52645c]">Property Source Exchange connects independent real estate communities, lenders, brokers, educators, and asset managers into one searchable, transacting ecosystem.</p><div className="mt-8 grid gap-4">{tools.slice(0, 3).map((tool) => <div key={tool} className="flex items-start gap-3 text-sm font-semibold text-[#244b3c]"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#d8efb0] text-[#2d7f58]"><Check size={13} strokeWidth={3} /></span>{tool}</div>)}</div><a href="#how-it-works" className="mt-9 inline-flex items-center text-sm font-bold text-[#2d7f58] hover:text-[#12352b]">Explore the exchange <ArrowRight className="ml-2" size={16} /></a></div><div className="relative"><div className="absolute -inset-5 rounded-[34px] bg-[#b7e44c]/20 blur-3xl" /><img src={networkImage} alt="Abstract map showing independent marketplaces connected to a central global exchange" className="relative rounded-[30px] shadow-[0_22px_70px_rgba(25,70,50,.18)]" /><div className="absolute -bottom-5 -left-5 rounded-2xl bg-white p-4 shadow-xl"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#e5f5c8] text-[#2d7f58]"><Handshake size={20} /></span><span className="text-xs font-semibold text-[#385b4c]">Independent brands.<br /><b className="text-[#12352b]">Shared global reach.</b></span></div></div></div></div></section>

        <section id="how-it-works" className="border-y border-[#dce6d7] bg-[#edf4e8] py-24 lg:py-28"><div className="container"><div className="max-w-2xl"><p className="eyebrow">Simple by design</p><h2 className="section-title">Start with your brand.<br /><em>Scale with the network.</em></h2></div><div className="mt-14 grid gap-5 md:grid-cols-3"><div className="step-card"><span>01</span><h3>Connect or launch</h3><p>Plug in your existing marketplace through our API, or choose a ready-to-brand turnkey template.</p></div><div className="step-card"><span>02</span><h3>Invite your members</h3><p>Bring your buyers, sellers, borrowers, or audience into a branded experience you own.</p></div><div className="step-card"><span>03</span><h3>Earn as they transact</h3><p>Share in marketplace activity, lending, premium services, and the transactions your community creates.</p></div></div><div className="mt-12 grid gap-5 rounded-[28px] bg-[#12352b] p-7 text-white md:grid-cols-[1fr_auto] md:items-center md:p-10"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#b7e44c]">Built for the full transaction</p><h3 className="mt-3 max-w-2xl font-display text-3xl leading-tight tracking-[-.04em]">From first search to accepted offer, everything stays connected.</h3></div><button onClick={goToRegistration} className="rounded-full bg-[#b7e44c] px-5 py-3 text-sm font-bold text-[#12352b] transition hover:bg-[#d1f37e]">Talk to the team <ArrowRight className="ml-2 inline" size={15} /></button></div></div></section>

        <section id="partners" className="container py-24 lg:py-32"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="eyebrow">Who can join</p><h2 className="section-title max-w-2xl">If you have a community,<br /><em>you have a marketplace.</em></h2></div><p className="max-w-sm text-sm leading-6 text-[#62776b]">Every partner keeps their identity while gaining access to an exchange much larger than any one marketplace.</p></div><div className="mt-14 grid gap-4 sm:grid-cols-2">{partnerTypes.map((partner) => <article key={partner.title} className="group rounded-[24px] border border-[#dce6d7] bg-white p-6 transition hover:-translate-y-1 hover:border-[#b7e44c] hover:shadow-[0_18px_50px_rgba(25,70,50,.1)]"><div className="flex items-start justify-between"><span className="font-display text-4xl font-semibold tracking-[-.08em] text-[#b7d29d]">{partner.icon}</span><span className="grid size-10 place-items-center rounded-full bg-[#eff7df] text-[#2d7f58] transition group-hover:bg-[#b7e44c] group-hover:text-[#12352b]"><ArrowRight size={17} /></span></div><h3 className="mt-8 font-display text-2xl font-semibold tracking-[-.04em]">{partner.title}</h3><p className="mt-3 text-sm leading-6 text-[#64776c]">{partner.text}</p></article>)}</div></section>

        
      </main>

      <footer className="bg-[#092d25] py-10 text-white"><div className="container flex flex-col justify-between gap-5 text-sm md:flex-row md:items-center"><div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-xl bg-[#b7e44c] text-[#12352b]"><Network size={17} /></span><span><b className="font-display">PROPERTY SOURCE</b> <span className="text-[#b7e44c]">EXCHANGE</span></span></div><p className="text-white/45">Owned and operated by Property Hub Exchange, Inc.</p><p className="text-white/45">© 2026 Property Source Exchange</p></div></footer>

      {showForm && <div className="fixed inset-0 z-50 grid place-items-center bg-[#051a15]/70 p-4 backdrop-blur-sm"><div className="relative w-full max-w-lg rounded-[28px] bg-[#f7f8f2] p-7 shadow-2xl md:p-10"><button onClick={() => setShowForm(false)} className="absolute right-5 top-5 grid size-9 place-items-center rounded-full bg-[#e8eee3] text-[#12352b]" aria-label="Close form"><X size={18} /></button><p className="eyebrow">Start the conversation</p><h2 className="mt-3 font-display text-4xl font-semibold leading-none tracking-[-.05em]">Build your marketplace.</h2><p className="mt-4 text-sm leading-6 text-[#62776b]">Tell us a little about your community and we’ll show you how quickly you can connect.</p><form onSubmit={submitForm} className="mt-7 grid gap-4"><input required placeholder="Your name" className="rounded-xl border border-[#d7e1d3] bg-white px-4 py-3 outline-none focus:border-[#2d7f58]" /><input required type="email" placeholder="Work email" className="rounded-xl border border-[#d7e1d3] bg-white px-4 py-3 outline-none focus:border-[#2d7f58]" /><select className="rounded-xl border border-[#d7e1d3] bg-white px-4 py-3 text-[#52645c] outline-none focus:border-[#2d7f58]" defaultValue=""><option value="" disabled>What best describes you?</option><option>Real estate community</option><option>Lender or lending broker</option><option>Influencer or coach</option><option>Asset manager</option><option>Brokerage</option></select><button type="submit" className="mt-2 rounded-full bg-[#12352b] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#205743]">Request a marketplace walkthrough <ArrowRight className="ml-2 inline" size={16} /></button></form></div></div>}
    </div>
  );
}
