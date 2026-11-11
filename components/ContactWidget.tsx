"use client";

import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { ContactForm } from "@/components/ContactForm";

// Signed-in areas have their own tools; the Contact page already shows the form.
const HIDDEN_ON = ["/admin", "/portal", "/login", "/contact", "/accept-invite", "/reset-password", "/forgot-password"];

// Floating message button, bottom-right on every public page. Opens the same
// contact form as the Contact page, in a native <dialog> (focus trapping,
// Escape-to-close and an inert page behind it come for free).
export function ContactWidget() {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Bumped each time the dialog opens, so the form starts fresh.
  const [formKey, setFormKey] = useState(0);

  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  function open() {
    setFormKey((k) => k + 1);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        onClick={open}
        aria-label="Send us a message"
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-black shadow-[0_10px_40px_rgba(232,184,75,0.35)] transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/40 sm:bottom-8 sm:right-8"
      >
        <MessageIcon />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="contact-widget-heading"
        // A click whose target is the dialog element itself landed on the backdrop.
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md bg-transparent p-0 text-white backdrop:bg-black/75 backdrop:backdrop-blur-sm sm:mb-28 sm:mr-8"
      >
        <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-accent/20 bg-[radial-gradient(circle_at_top_right,rgba(232,184,75,0.12),transparent_55%),#15120c] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Message us</p>
              <h2 id="contact-widget-heading" className="mt-2 text-xl font-semibold tracking-tight text-white">
                How can we help?
              </h2>
            </div>
            <button
              onClick={close}
              aria-label="Close"
              className="-mr-2 -mt-2 rounded-full p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <p className="mb-5 mt-2 text-sm leading-relaxed text-zinc-300">
            Send a message and our team will get back to you, usually within one business day.
          </p>
          <ContactForm key={formKey} source="WIDGET" compact onDone={close} />
        </div>
      </dialog>
    </>
  );
}

function MessageIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z" />
      <path d="M8.5 10.5h7M8.5 13.5h4.5" />
    </svg>
  );
}
