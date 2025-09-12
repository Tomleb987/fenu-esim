export default function Contact() {
  return (
    <div className="max-w-xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Contactez-nous</h1>
      
      <div className="bg-white rounded-xl shadow p-6 space-y-6 border border-purple-100 text-gray-800">
        <div className="space-y-1">
          <p className="font-semibold">📞 Whatsapp :</p>
          <p>
            <a href="tel:+33749782101" className="text-purple-600 hover:underline">
              +33 7 49 78 21 01
            </a>
          </p>
        </div>

        <div className="space-y-1">
          <p className="font-semibold">📧 Email :</p>
          <p>
            <a href="mailto:contact@fenuasim.com" className="text-purple-600 hover:underline">
              contact@fenuasim.com
            </a>
          </p>
        </div>

        <div className="space-y-1">
          <p className="font-semibold">📱 WhatsApp :</p>
          <p>
            <a href="https://wa.me/33749782101" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
              Envoyer un message WhatsApp
            </a>
          </p>
        </div>

        <div className="space-y-1">
          <p className="font-semibold">🌐 Réseaux sociaux :</p>
          <p>
            <a href="https://www.facebook.com/fenuasim" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
              Facebook (@fenuasim)
            </a>
          </p>
          <p>
            <a href="https://www.instagram.com/fenuasim" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
              Instagram (@fenuasim)
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
