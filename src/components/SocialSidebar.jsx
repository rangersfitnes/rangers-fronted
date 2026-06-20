import './SocialSidebar.css'

const INSTAGRAM_URL =
  'https://www.instagram.com/rangers.box?igsh=cmI0b2o1NTc0aTh1&utm_source=qr'

const socialLinks = [
  { label: 'FB', href: '#facebook', title: 'Facebook' },
  {
    label: 'IG',
    href: INSTAGRAM_URL,
    title: 'Instagram',
    external: true,
  },
  { label: 'YT', href: '#youtube', title: 'YouTube' },
]

function SocialSidebar() {
  return (
    <aside className="social-sidebar" aria-label="Redes sociales">
      <ul className="social-sidebar__list">
        {socialLinks.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              className="social-sidebar__link"
              title={link.title}
              {...(link.external
                ? {
                    target: '_blank',
                    rel: 'noopener noreferrer',
                  }
                : {})}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  )
}

export default SocialSidebar
