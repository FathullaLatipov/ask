import { useTranslation } from 'react-i18next'
import './LanguageSwitcher.css'

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const languages = [
    { code: 'ru', label: 'РУ', name: 'Русский' },
    { code: 'uz', label: 'UZ', name: "O'zbek" },
  ]

  const changeLanguage = async (langCode) => {
    await i18n.changeLanguage(langCode)
    // Сохраняем язык в localStorage для использования в API запросах
    localStorage.setItem('i18nextLng', langCode)
    // Обновляем данные без перезагрузки страницы
    // Событие будет обработано компонентами, которые используют useTranslation
    window.dispatchEvent(new Event('languageChanged'))
  }

  return (
    <div className="language-switcher">
      {languages.map((lang) => (
        <button
          key={lang.code}
          className={`lang-btn ${i18n.language === lang.code ? 'active' : ''}`}
          onClick={() => changeLanguage(lang.code)}
          title={lang.name}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}

