import { ContactLine, LegalList, LegalPage, LegalSection, linkClass } from './legal-page';
import type { LegalContact } from './legal-contact';

export function PrivacyPolicy({ contact }: { contact: LegalContact }) {
  return (
    <LegalPage title="Privacy policy">
      <p className="text-body text-ink">
        babble helps your family keep track of your baby's day. This page explains what we keep, why, where it lives and
        what you can do about it.
      </p>

      <LegalSection title="Who we are">
        <p>
          In this policy, "we" means {contact.operator}. To contact us, <ContactLine contact={contact} />.
        </p>
        <p>
          babble is open source, so anyone can run their own server. If you use a server someone else runs, they're
          responsible for it and may use different providers from the ones listed here.
        </p>
      </LegalSection>

      <LegalSection title="What we collect">
        <LegalList>
          <li>
            <strong>Your account:</strong> your email address, your display name, and either your password (stored
            hashed by Supabase Auth, never in plain text) or the sign-in links we email you.
          </li>
          <li>
            <strong>Your family:</strong> its name, its members and their roles, and the invites you create.
          </li>
          <li>
            <strong>Your baby:</strong> their name, birth date, sex (if you add it), timezone and when their day starts.
          </li>
          <li>
            <strong>Everything you log:</strong> feeds, sleep, nappies, pumping, growth, custom events and notes, with
            their times and who logged or ended them.
          </li>
          <li>
            <strong>Your settings:</strong> things like feed intervals, night hours and how you like the app to work.
          </li>
          <li>
            <strong>On your device:</strong> your sign-in session and a few preferences (theme, which baby is active, a
            cached copy of your night hours, and whether you've dismissed the install card). These stay in your browser
            or phone's local storage.
          </li>
        </LegalList>
        <p>No ads. No analytics. No tracking cookies. We never sell your data.</p>
      </LegalSection>

      <LegalSection title="Why we keep it">
        <p>
          To run babble for your family: to show your records to you and the people you share them with, and to send
          sign-in and invite emails. Nothing else.
        </p>
      </LegalSection>

      <LegalSection title="Where it lives">
        <LegalList>
          <li>The database and sign-in are run by Supabase in Sydney, Australia (region ap-southeast-2).</li>
          <li>The web app runs on Fly.io in Sydney, Australia.</li>
          <li>Sign-in and invite emails are sent by Resend, in the United States.</li>
          <li>
            If Google sign-in is available on this server and you use it, Google shares your name and email with us.
          </li>
        </LegalList>
        <p>These providers keep server logs, such as IP addresses, for security and to keep things running.</p>
      </LegalSection>

      <LegalSection title="Who can see it">
        <p>
          The members of your family can see your family's data. Other families can't: database rules stop them, not
          just the app.
        </p>
        <p>
          We and our hosting providers can technically get into the database. We only look at it to fix a problem you've
          told us about, to keep babble running and secure, or when the law requires it.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          babble is for parents and caregivers. The information in it is about children, but children shouldn't use
          babble themselves.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <LegalList>
          <li>Export everything at any time from Settings → Data → Export.</li>
          <li>Edit or delete any entry.</li>
          <li>
            Delete your account from Settings → Account. This removes your account and takes you out of your family.
            Your family's shared entries stay for the other members. When the last member of a family deletes their
            account, the family, its babies and all its entries are deleted.
          </li>
        </LegalList>
        <p>Our hosting providers' backups may keep copies for a limited time before they expire.</p>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>
          Under the New Zealand Privacy Act 2020 you can ask to see the information we hold about you, and ask us to
          correct it. To do that, <ContactLine contact={contact} />.
        </p>
        <p>
          If you're not happy with how we've handled your information, you can complain to the Office of the Privacy
          Commissioner at{' '}
          <a href="https://www.privacy.org.nz" className={linkClass}>
            privacy.org.nz
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          If we change this policy we'll update the date at the top. For significant changes, we'll also tell you in the
          app.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
