import { LEGAL_PATHS, SOURCE_URL, type LegalContact } from './legal-contact';
import { ContactLine, LegalList, LegalPage, LegalSection, linkClass } from './legal-page';

export function TermsOfUse({ contact }: { contact: LegalContact }) {
  return (
    <LegalPage title="Terms of use">
      <p className="text-body text-ink">
        These terms are between you and {contact.operator} ("we"). By using babble you agree to them. Our{' '}
        <a href={LEGAL_PATHS.privacy} className={linkClass}>
          privacy policy
        </a>{' '}
        explains how we handle your information.
      </p>

      <LegalSection title="What babble is">
        <p>babble is a free tool to track your baby's day: feeds, sleep, nappies and more, shared with your family.</p>
      </LegalSection>

      <LegalSection title="Not medical advice">
        <p>
          Growth percentiles, reminders and stats are there to help you keep track. They aren't medical advice. If
          you're worried about your baby, talk to your midwife, Plunket nurse or GP, or call Healthline on 0800 611 116.
        </p>
        <p>
          <strong>In an emergency, call 111.</strong>
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <LegalList>
          <li>Keep your sign-in details safe.</li>
          <li>You're responsible for who you invite into your family.</li>
          <li>
            Anyone you invite as a caregiver can add, change and delete your family's data. Viewers can only look.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Using babble fairly">
        <p>Please don't:</p>
        <LegalList>
          <li>misuse babble or use it to break the law</li>
          <li>try to get into another family's data</li>
          <li>overload babble with bots, scripts or other automated abuse.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Your data stays yours">
        <p>
          You own what you put into babble. You give us permission to store and process it only so we can run babble for
          you.
        </p>
      </LegalSection>

      <LegalSection title="Availability">
        <p>
          babble is free and provided as is. It may change or stop. If we're going to shut it down, we'll try to give
          you notice and time to export your data.
        </p>
      </LegalSection>

      <LegalSection title="Our liability">
        <p>
          To the extent the law allows, we aren't liable for any loss that comes from using babble or not being able to
          use it. Nothing in these terms limits your rights under the Consumer Guarantees Act 1993 or the Fair Trading
          Act 1986 where they apply.
        </p>
      </LegalSection>

      <LegalSection title="Ending things">
        <p>
          You can stop using babble at any time and delete your account from Settings → Account. We can suspend accounts
          that break these terms.
        </p>
      </LegalSection>

      <LegalSection title="Open source">
        <p>
          babble's code is open source under the GNU Affero General Public License v3.0 (AGPL-3.0). You can find it at{' '}
          <a href={SOURCE_URL} className={linkClass}>
            github.com/JoelBrenstrum/babble
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="The law">
        <p>New Zealand law applies to these terms.</p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about these terms? Please <ContactLine contact={contact} />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
