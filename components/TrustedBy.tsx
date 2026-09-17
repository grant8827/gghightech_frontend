import Image from "next/image";

type Client = {
  name: string;
  logo: string;
  url: string;
};

const CLIENTS: Client[] = [
  { name: "Church Books Management", logo: "/images/church_books_logo.png", url: "https://churchbooksmanagement.com/" },
  { name: "HRBooks360", logo: "/images/hrbooks360_logo.png", url: "https://www.hrbooks360.com/" },
  { name: "IsleVendor", logo: "/images/islevendor_logo.png", url: "https://islevendor.com/" },
  { name: "Radio In One Stop", logo: "/images/radioinonestop_logo.png", url: "https://radioinonestop.com/" },
  { name: "RentalHist", logo: "/images/rentalhist-logo.png", url: "https://rentalhist.com/" },
  { name: "RightFitGigs", logo: "/images/rightfitgigs_logo.png", url: "https://www.rightfitgigs.com/" },
  { name: "Virtual Event Plus", logo: "/images/virtualeventplus.png", url: "https://www.virtualeventplus.com/" },
  {
    name: "Safe Haven Restoration Ministry",
    logo: "/images/Safe%20haven%20restoration%20minitry-logo.png",
    url: "/images/Safe%20haven%20restoration%20minitry-logo.png",
  },
];

function LogoCard({ client, hidden = false }: { client: Client; hidden?: boolean }) {
  return (
    <a
      href={client.url}
      target="_blank"
      rel="noopener noreferrer"
      title={client.name}
      tabIndex={hidden ? -1 : 0}
      aria-hidden={hidden}
      className="group relative flex h-20 w-40 shrink-0 items-center justify-center rounded-xl bg-white p-3 shadow-sm ring-1 ring-white/10 transition-transform hover:-translate-y-0.5 hover:shadow-md"
    >
      <Image
        src={client.logo}
        alt={hidden ? "" : client.name}
        fill
        sizes="160px"
        className="object-contain transition-transform group-hover:scale-105"
      />
    </a>
  );
}

export function TrustedBy() {
  return (
    <section className="border-t border-white/10 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-zinc-500">
          Trusted By
        </p>

        <div className="marquee-fade mt-8 overflow-hidden">
          <div className="marquee-track flex w-max items-center gap-5">
            {CLIENTS.map((client) => (
              <LogoCard key={client.name} client={client} />
            ))}
            {/* Exact duplicate, hidden from assistive tech / keyboard nav —
                the CSS animation scrolls exactly one set's width (-50%) so
                this copy is what's visible sliding in behind the first. */}
            {CLIENTS.map((client) => (
              <LogoCard key={`${client.name}-dup`} client={client} hidden />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
