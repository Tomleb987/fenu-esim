"use client"

import Link from 'next/link'
import Image from 'next/image'
import { Instagram, Facebook, Linkedin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="relative z-50 w-full bg-gradient-to-b from-[#14162b] to-[#1a1a2e] text-white pt-16 pb-8 mt-auto shadow-2xl">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* À propos */}
          <div>
            <div className="relative h-12 w-32 mb-4">
              <Image
                src="/logo.png"
                alt="FENUA SIM Logo"
                fill
                className="object-contain"
              />
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              FENUA SIM, votre partenaire pour rester connecté partout dans le monde avec des forfaits eSIM adaptés à vos besoins.
            </p>
          </div>

          {/* Liens rapides */}
          <div>
            <h3 className="uppercase text-lg font-extrabold text-[var(--fenua-purple)] mb-4 tracking-wider">Liens rapides</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:underline hover:text-fenua-orange transition-colors">Accueil</Link></li>
              <li><Link href="/shop" className="hover:underline hover:text-fenua-orange transition-colors">Nos eSIM</Link></li>
              <li><Link href="/recharge" className="hover:underline hover:text-fenua-orange transition-colors">Recharger</Link></li>
              <li><Link href="/contact" className="hover:underline hover:text-fenua-orange transition-colors">Contact</Link></li>
              <li><Link href="/about" className="hover:underline hover:text-fenua-orange transition-colors">À propos</Link></li>
              <li><Link href="/concours" className="hover:underline hover:text-fenua-orange transition-colors">Concours</Link></li>
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h3 className="uppercase text-lg font-extrabold text-[var(--fenua-purple)] mb-4 tracking-wider">Légal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/mentions-legales" className="hover:underline hover:text-fenua-orange transition-colors">Mentions légales</Link></li>
              <li><Link href="/cgu" className="hover:underline hover:text-fenua-orange transition-colors">CGU</Link></li>
              <li><Link href="/confidentialite" className="hover:underline hover:text-fenua-orange transition-colors">Politique de confidentialité</Link></li>
            </ul>
          </div>

          {/* Contact & Réseaux sociaux */}
          <div>
            <h3 className="uppercase text-lg font-extrabold text-[var(--fenua-purple)] mb-4 tracking-wider">Contact</h3>
            <ul className="space-y-2 text-sm mb-4">
              <li>Email : <a href="mailto:contact@fenuasim.com" className="hover:underline hover:text-fenua-orange transition-colors">contact@fenuasim.com</a></li>
              <li>Support 24/7</li>
            </ul>
            <div className="flex gap-4 mt-2">
              <a href="#" aria-label="Instagram" className="hover:text-fenua-orange transition-colors"><Instagram size={22} /></a>
              <a href="#" aria-label="Facebook" className="hover:text-fenua-orange transition-colo
