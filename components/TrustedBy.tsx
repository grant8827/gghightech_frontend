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
];

export function TrustedBy() {
  return (
    <section className="border-t border-white/10 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-zinc-500">
          Trusted By
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
          {CLIENTS.map((client) => (
            <a
              key={client.name}
              href={client.url}
              target="_blank"
              rel="noopener noreferrer"
              title={client.name}
              className="group relative flex h-20 w-40 items-center justify-center rounded-xl bg-white p-3 shadow-sm ring-1 ring-white/10 transition-transform hover:-translate-y-0.5 hover:shadow-md"
            >
              <Image
                src={client.logo}
                alt={client.name}
                fill
                sizes="160px"
                className="object-contain transition-transform group-hover:scale-105"
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
