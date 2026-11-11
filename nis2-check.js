/**
 * Oxly NIS2 quick check — client-side logic only, no network requests.
 * Basis: BSIG 2025 (sections 28, Annexes 1 and 2), as reviewed on 11 November 2026.
 */
(function (root) {
  "use strict";

  var TITLES = {
    de: {
      bwe: "Voraussichtlich besonders wichtige Einrichtung",
      we: "Voraussichtlich wichtige Einrichtung",
      nicht: "Voraussichtlich keine besonders wichtige oder wichtige Einrichtung nach § 28 – eine Kunden- oder Lieferbeziehung allein begründet typischerweise keine solche Einordnung",
      pruefung: "Weitere Prüfung erforderlich"
    },
    en: {
      bwe: "Likely a particularly important entity",
      we: "Likely an important entity",
      nicht: "Likely not a particularly important or important entity under section 28 – a customer or supply-chain relationship alone typically does not create that status",
      pruefung: "Further review required"
    }
  };

  /* German titles kept as LEVELS for compatibility with existing tests. */
  var LEVELS = TITLES.de;

  var REASONS = {
    de: {
      special_kritis: "Betreiber kritischer Anlagen (KRITIS) gelten nach § 28 Abs. 1 Nr. 1 BSIG unabhängig von der Unternehmensgröße als besonders wichtige Einrichtungen.",
      special_qualified: "Qualifizierte Vertrauensdiensteanbieter, TLD-Registries und DNS-Diensteanbieter gelten nach § 28 Abs. 1 Nr. 2 BSIG unabhängig von der Unternehmensgröße als besonders wichtige Einrichtungen.",
      special_telecom_bwe: "Anbieter öffentlich zugänglicher Telekommunikationsdienste bzw. Betreiber öffentlicher Telekommunikationsnetze gelten nach § 28 Abs. 1 Nr. 3 BSIG als besonders wichtige Einrichtungen, wenn sie mindestens 50 Beschäftigte haben oder Jahresumsatz und Jahresbilanzsumme jeweils 10 Millionen Euro übersteigen.",
      special_telecom_we: "Kleinere Telekommunikationsanbieter bzw. -netzbetreiber unterhalb der Schwellen des § 28 Abs. 1 Nr. 3 BSIG gelten nach § 28 Abs. 2 Nr. 2 BSIG als wichtige Einrichtungen.",
      special_telecom_pruefung: "Bei Telekommunikationsanbietern entscheidet die Größe über die Einstufung als besonders wichtige (§ 28 Abs. 1 Nr. 3 BSIG) oder wichtige Einrichtung (§ 28 Abs. 2 Nr. 2 BSIG). Die vorliegenden Größenangaben reichen für eine vorläufige Zuordnung nicht aus.",
      special_trust_bwe: "Neben der Stellung als (nicht qualifizierter) Vertrauensdiensteanbieter erfüllen die Angaben auch die Größen- und Sektorschwellen für besonders wichtige Einrichtungen nach § 28 Abs. 1 Nr. 4 BSIG.",
      special_trust_we: "Vertrauensdiensteanbieter, die nicht unter § 28 Abs. 1 Nr. 2 BSIG fallen, gelten nach § 28 Abs. 2 Nr. 1 BSIG unabhängig von der Unternehmensgröße als wichtige Einrichtungen.",
      special_unsure: "Ob ein besonderer gesetzlicher Fall vorliegt (etwa KRITIS, qualifizierte Vertrauensdienste, DNS/TLD oder Telekommunikation), ist noch unsicher und sollte gesondert geprüft werden.",
      offers_mismatch: "Die sektoralen Schwellen des § 28 Abs. 1 Nr. 4 und Abs. 2 Nr. 3 BSIG knüpfen daran, dass Waren oder Dienstleistungen angeboten werden. Ihre Angaben dazu weichen von der Sektorzuordnung ab; eine Einzelfallprüfung ist sinnvoll.",
      unsure_annex_bwe: "Nach Sektor und Größe wäre voraussichtlich eine besonders wichtige Einrichtung anzunehmen (§ 28 Abs. 1 Nr. 4 BSIG). Ein zusätzlicher Sonderfall könnte das Ergebnis bestätigen, ändert die vorläufige Höherstufung aber typischerweise nicht.",
      unsure_annex_we: "Nach Sektor und Größe wäre voraussichtlich mindestens eine wichtige Einrichtung anzunehmen. Ein noch ungeklärter Sonderfall (etwa KRITIS oder qualifizierte Vertrauensdienste) könnte zu einer höheren Einstufung führen.",
      unsure_annex_nicht: "Ohne Sonderfall und unterhalb der Schwellen oder außerhalb der Anlagen 1 und 2 wäre voraussichtlich keine direkte Betroffenheit anzunehmen. Ein noch ungeklärter Sonderfall kann das Ergebnis ändern.",
      unsure_unclear: "Sektor und/oder Größe sind nicht eindeutig genug für eine vorläufige Zuordnung.",
      annex1_large: "Im Sektor hoher Kritikalität (Anlage 1 BSIG) und bei Erreichen der Schwellen für große Unternehmen (§ 28 Abs. 1 Nr. 4 BSIG: mindestens 250 Beschäftigte oder Jahresumsatz über 50 Millionen Euro und Jahresbilanzsumme über 43 Millionen Euro) ist voraussichtlich eine besonders wichtige Einrichtung anzunehmen.",
      annex1_medium: "Im Sektor hoher Kritikalität (Anlage 1 BSIG) und bei Erreichen der mittleren Schwellen (§ 28 Abs. 2 Nr. 3 BSIG: mindestens 50 Beschäftigte oder Jahresumsatz und Jahresbilanzsumme jeweils über 10 Millionen Euro), ohne die Schwellen für besonders wichtige Einrichtungen zu erfüllen, ist voraussichtlich eine wichtige Einrichtung anzunehmen.",
      annex1_small: "Auch bei einem Tätigkeitsfeld nach Anlage 1 BSIG liegen die vorliegenden Größenangaben unter den Schwellen des § 28 BSIG. Voraussichtlich besteht keine direkte Einordnung als besonders wichtige oder wichtige Einrichtung.",
      annex1_pruefung: "Der Sektor nach Anlage 1 BSIG ist angegeben, die Größenangaben reichen aber nicht aus, um zwischen besonders wichtiger Einrichtung, wichtiger Einrichtung und Nichtbetroffenheit zu unterscheiden.",
      annex2_medium: "In einem Sektor nach Anlage 2 BSIG führen die mittleren oder großen Schwellen nach § 28 Abs. 2 Nr. 3 BSIG voraussichtlich zu einer wichtigen Einrichtung. Eine Einstufung als besonders wichtige Einrichtung ergibt sich aus der Größe in Anlage-2-Sektoren allein nicht.",
      annex2_small: "Auch bei einem Tätigkeitsfeld nach Anlage 2 BSIG liegen die vorliegenden Größenangaben unter den Schwellen des § 28 BSIG. Voraussichtlich besteht keine direkte Einordnung als wichtige Einrichtung.",
      annex2_pruefung: "Der Sektor nach Anlage 2 BSIG ist angegeben, die Größenangaben reichen aber nicht aus, um zwischen wichtiger Einrichtung und Nichtbetroffenheit zu unterscheiden.",
      sector_none: "Ohne Zuordnung zu Anlage 1 oder 2 BSIG und ohne besonderen gesetzlichen Fall ist voraussichtlich keine direkte Betroffenheit als besonders wichtige oder wichtige Einrichtung anzunehmen.",
      sector_unsure_small: "Selbst wenn ein Sektor der Anlagen 1 oder 2 vorläge, lägen die Größenangaben unter den gesetzlichen Schwellen. Voraussichtlich besteht keine direkte Betroffenheit, sofern kein Sonderfall greift.",
      sector_unsure_large: "Bei großen Unternehmen kann je nach Sektor eine besonders wichtige (Anlage 1) oder wichtige Einrichtung (Anlage 2) in Betracht kommen. Die Sektorzuordnung sollte geprüft werden.",
      sector_unsure_medium: "Bei Erreichen der mittleren Schwellen kann je nach Sektor eine wichtige Einrichtung in Betracht kommen. Die Sektorzuordnung sollte geprüft werden.",
      supply_chain: "Auch ohne direkte Regulierung können Kunden oder Auftraggeber, die selbst unter das BSIG fallen, vertragliche Sicherheitsanforderungen in der Lieferkette stellen."
    },
    en: {
      special_kritis: "Operators of critical facilities (KRITIS) are particularly important entities under section 28(1) no. 1 BSIG, regardless of company size.",
      special_qualified: "Qualified trust service providers, TLD registries and DNS service providers are particularly important entities under section 28(1) no. 2 BSIG, regardless of company size.",
      special_telecom_bwe: "Providers of publicly available electronic communications services or operators of public electronic communications networks are particularly important entities under section 28(1) no. 3 BSIG if they have at least 50 employees or if both annual turnover and annual balance-sheet total exceed EUR 10 million.",
      special_telecom_we: "Smaller electronic communications providers or network operators below the thresholds in section 28(1) no. 3 BSIG are important entities under section 28(2) no. 2 BSIG.",
      special_telecom_pruefung: "For electronic communications providers, size determines whether the entity is particularly important (section 28(1) no. 3 BSIG) or important (section 28(2) no. 2 BSIG). The size information given here is not sufficient for a preliminary classification.",
      special_trust_bwe: "In addition to the status as a (non-qualified) trust service provider, the information also meets the size and sector thresholds for particularly important entities under section 28(1) no. 4 BSIG.",
      special_trust_we: "Trust service providers that do not fall under section 28(1) no. 2 BSIG are important entities under section 28(2) no. 1 BSIG, regardless of company size.",
      special_unsure: "Whether a special statutory case applies (for example KRITIS, qualified trust services, DNS/TLD or electronic communications) is still uncertain and should be reviewed separately.",
      offers_mismatch: "The sectoral thresholds in section 28(1) no. 4 and section 28(2) no. 3 BSIG require that goods or services are offered. Your answers on that point do not match the sector classification; a case-by-case review is advisable.",
      unsure_annex_bwe: "Based on sector and size, the entity would likely be a particularly important entity (section 28(1) no. 4 BSIG). An additional special case could confirm this result, but would not typically change this higher classification.",
      unsure_annex_we: "Based on sector and size, the entity would likely be at least an important entity. An unresolved special case (for example KRITIS or qualified trust services) could lead to a higher classification.",
      unsure_annex_nicht: "Without a special case and below the thresholds, or outside Annexes 1 and 2, no direct in-scope classification would be likely. An unresolved special case may change the result.",
      unsure_unclear: "Sector and/or size are not clear enough for a preliminary classification.",
      annex1_large: "In a high-criticality sector (Annex 1 BSIG) and where the thresholds for large companies are met (section 28(1) no. 4 BSIG: at least 250 employees, or annual turnover above EUR 50 million and annual balance-sheet total above EUR 43 million), the entity is likely a particularly important entity.",
      annex1_medium: "In a high-criticality sector (Annex 1 BSIG) and where the medium-size thresholds are met (section 28(2) no. 3 BSIG: at least 50 employees, or both annual turnover and annual balance-sheet total above EUR 10 million), without meeting the thresholds for particularly important entities, the entity is likely an important entity.",
      annex1_small: "Even in a field of activity under Annex 1 BSIG, the size figures given are below the thresholds in section 28 BSIG. A direct classification as a particularly important or important entity is therefore unlikely.",
      annex1_pruefung: "An Annex 1 BSIG sector is indicated, but the size figures are not sufficient to distinguish between a particularly important entity, an important entity and being out of direct scope.",
      annex2_medium: "In an Annex 2 BSIG sector, the medium or large-size thresholds under section 28(2) no. 3 BSIG likely lead to classification as an important entity. Size alone in Annex 2 sectors does not result in classification as a particularly important entity.",
      annex2_small: "Even in a field of activity under Annex 2 BSIG, the size figures given are below the thresholds in section 28 BSIG. A direct classification as an important entity is therefore unlikely.",
      annex2_pruefung: "An Annex 2 BSIG sector is indicated, but the size figures are not sufficient to distinguish between an important entity and being out of direct scope.",
      sector_none: "Without an assignment to Annex 1 or 2 BSIG and without a special statutory case, a direct classification as a particularly important or important entity is unlikely.",
      sector_unsure_small: "Even if a sector in Annex 1 or 2 applied, the size figures would be below the statutory thresholds. Direct in-scope status is therefore unlikely, unless a special case applies.",
      sector_unsure_large: "For large companies, a particularly important entity (Annex 1) or an important entity (Annex 2) may come into question depending on the sector. The sector classification should be reviewed.",
      sector_unsure_medium: "Where the medium-size thresholds are met, an important entity may come into question depending on the sector. The sector classification should be reviewed.",
      supply_chain: "Even without being directly regulated, customers or clients that themselves fall under the BSIG may impose contractual security requirements in the supply chain."
    }
  };

  function langOf(lang) {
    return lang === "en" ? "en" : "de";
  }

  function turnoverOver10(t) {
    return t === "over10_50" || t === "over50";
  }
  function balanceOver10(b) {
    return b === "over10_43" || b === "over43";
  }

  function sizeFlags(employees, turnover, balance) {
    var large = employees === "250plus" || (turnover === "over50" && balance === "over43");
    var financialMedium = turnoverOver10(turnover) && balanceOver10(balance);
    var medium = employees === "50to249" || employees === "250plus" || financialMedium;
    var clearlySmall = employees === "under50" && (turnover === "upto10" || balance === "upto10");
    var unsure = !large && !medium && !clearlySmall;
    return {
      large: large,
      medium: medium || large,
      clearlySmall: clearlySmall,
      unsure: unsure
    };
  }

  function annexLevel(sector, size) {
    if (sector === "annex1") {
      if (size.large) return "bwe";
      if (size.medium) return "we";
      if (size.clearlySmall) return "nicht";
      return "pruefung";
    }
    if (sector === "annex2") {
      if (size.medium || size.large) return "we";
      if (size.clearlySmall) return "nicht";
      return "pruefung";
    }
    if (sector === "none") return "nicht";
    if (sector === "unsure") {
      if (size.clearlySmall) return "nicht";
      return "pruefung";
    }
    return "pruefung";
  }

  function evaluate(answers, lang) {
    lang = langOf(lang);
    var special = answers.special || "";
    var sector = answers.sector || "";
    var size = sizeFlags(answers.employees, answers.turnover, answers.balance);
    var keys = [];
    var level = "pruefung";
    var byAnnex = annexLevel(sector, size);

    if (special === "kritis") {
      level = "bwe";
      keys.push("special_kritis");
    } else if (special === "qualified_dns_tld") {
      level = "bwe";
      keys.push("special_qualified");
    } else if (special === "telecom") {
      if (size.medium || size.large) {
        level = "bwe";
        keys.push("special_telecom_bwe");
      } else if (size.clearlySmall) {
        level = "we";
        keys.push("special_telecom_we");
      } else {
        level = "pruefung";
        keys.push("special_telecom_pruefung");
      }
    } else if (special === "trust_other") {
      if (byAnnex === "bwe") {
        level = "bwe";
        keys.push("special_trust_bwe");
      } else {
        level = "we";
        keys.push("special_trust_we");
      }
    } else {
      if (special === "unsure") {
        keys.push("special_unsure");
      }

      if (answers.offers === "no" && special === "none" && (sector === "annex1" || sector === "annex2")) {
        level = "pruefung";
        keys.push("offers_mismatch");
      } else if (special === "unsure") {
        if (byAnnex === "bwe") {
          level = "bwe";
          keys.push("unsure_annex_bwe");
        } else {
          level = "pruefung";
          if (byAnnex === "we") {
            keys.push("unsure_annex_we");
          } else if (byAnnex === "nicht") {
            keys.push("unsure_annex_nicht");
          } else {
            keys.push("unsure_unclear");
          }
        }
      } else {
        level = byAnnex;
        if (sector === "annex1") {
          if (size.large) keys.push("annex1_large");
          else if (size.medium) keys.push("annex1_medium");
          else if (size.clearlySmall) keys.push("annex1_small");
          else keys.push("annex1_pruefung");
        } else if (sector === "annex2") {
          if (size.medium || size.large) keys.push("annex2_medium");
          else if (size.clearlySmall) keys.push("annex2_small");
          else keys.push("annex2_pruefung");
        } else if (sector === "none") {
          keys.push("sector_none");
        } else if (sector === "unsure") {
          if (size.clearlySmall) keys.push("sector_unsure_small");
          else if (size.large) keys.push("sector_unsure_large");
          else if (size.medium) keys.push("sector_unsure_medium");
          else keys.push("unsure_unclear");
        }
      }
    }

    if (level === "nicht") {
      keys.push("supply_chain");
    }

    var table = REASONS[lang] || REASONS.de;
    var reasons = keys.map(function (k) { return table[k] || (REASONS.de[k] || k); });

    return {
      level: level,
      title: (TITLES[lang] || TITLES.de)[level] || TITLES.de.pruefung,
      reasons: reasons,
      reasonKeys: keys,
      size: size,
      usesAi: answers.usesAi === "yes",
      lang: lang
    };
  }

  var UI = {
    de: {
      kicker: "Ergebnis",
      why: "Warum dieses Ergebnis?",
      next: "Nächste Schritte",
      aiHeading: "Hinweis zum AI Act (Art. 4 – KI-Kompetenz)",
      aiBody: "Nach Art. 4 der Verordnung (EU) 2024/1689 (KI-Verordnung) müssen Anbieter und Betreiber von KI-Systemen soweit möglich Maßnahmen ergreifen, um die KI-Kompetenz ihres Personals und anderer Personen, die in ihrem Auftrag mit KI-Systemen befasst sind, zu fördern. Die ursprüngliche Verpflichtung gilt seit dem 2. Februar 2025. Sie gilt nicht für eine rein private Nutzung.",
      aiYes: " Ihre Angabe, dass in Ihrem Unternehmen KI-Systeme eingesetzt werden, macht diese Pflicht besonders praktisch relevant.",
      aiNo: " Die Pflicht knüpft nicht an eine NIS2-Betroffenheit an.",
      aiSource: ' Quelle: amtlicher Wortlaut im <a href="https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32024R1689" rel="noopener noreferrer">Amtsblatt der EU</a>; Erläuterungen der Kommission in den <a href="https://digital-strategy.ec.europa.eu/de/faqs/ai-literacy-questions-answers" rel="noopener noreferrer">Fragen und Antworten zur KI-Kompetenz</a>.',
      cta: "Das Oxly NIS2 &amp; AI Act Readiness Kit (Version 1.1, Stand November 2026) bündelt einen Leitfaden (PDF, 18 Seiten) und 11 Vorlagen (DOCX und XLSX) als ZIP-Download. Einmalzahlung (97&nbsp;€ inkl. MwSt., kein Abo).",
      ctaBtn: "Zum Readiness Kit",
      printBtn: "Ergebnis drucken / als PDF speichern",
      printHint: "Im Druckdialog Ihres Browsers können Sie „Als PDF speichern“ wählen. Es werden nur Ihre Angaben auf dieser Seite verarbeitet, nichts wird an uns gesendet.",
      sourcesHeading: "Quellen",
      sources: [
        '<a href="https://www.gesetze-im-internet.de/bsig_2025/__28.html" rel="noopener noreferrer">§ 28 BSIG</a> (besonders wichtige und wichtige Einrichtungen)',
        '<a href="https://www.gesetze-im-internet.de/bsig_2025/__33.html" rel="noopener noreferrer">§ 33 BSIG</a> (Registrierung)',
        '<a href="https://www.gesetze-im-internet.de/bsig_2025/anlage_1.html" rel="noopener noreferrer">Anlage 1 BSIG</a> und <a href="https://www.gesetze-im-internet.de/bsig_2025/anlage_2.html" rel="noopener noreferrer">Anlage 2 BSIG</a>',
        '<a href="https://www.bsi.bund.de/DE/Home/home_node.html" rel="noopener noreferrer">BSI-Startseite</a> (Hinweis zur abgelaufenen Registrierungsfrist, Einsichtnahme am 11. November 2026)',
        '<a href="https://www.bsi.bund.de/DE/Themen/Regulierte-Wirtschaft/NIS-2-regulierte-Unternehmen/BSI-Portal/bsi-portal.html" rel="noopener noreferrer">BSI-Portal: Informationen zur Registrierung</a>',
        '<a href="https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32024R1689" rel="noopener noreferrer">Verordnung (EU) 2024/1689, Art. 4</a>'
      ],
      disclaimer: "Orientierung, keine Rechtsberatung. Das Ergebnis ersetzt keine Prüfung durch die zuständige Behörde oder rechtliche Beratung.",
      stepsIn: [
        "Prüfen Sie das Ergebnis anhand des amtlichen Wortlauts (§ 28 BSIG sowie Anlagen 1 und 2) und – bei verbundenen Unternehmen – der maßgeblichen Größenschwellen.",
        "Besonders wichtige und wichtige Einrichtungen müssen sich nach § 33 Abs. 1 BSIG spätestens drei Monate, nachdem sie erstmals oder erneut als solche gelten, beim BSI registrieren. Das BSI weist derzeit darauf hin, dass die gesetzliche Registrierungsfrist bereits abgelaufen ist und betroffene Einrichtungen sich umgehend im BSI-Portal registrieren sollen (Hinweis auf der <a href=\"https://www.bsi.bund.de/DE/Home/home_node.html\" rel=\"noopener noreferrer\">BSI-Startseite</a>, Einsichtnahme am 11. November 2026).",
        "Die Registrierung erfolgt zweistufig über Mein Unternehmenskonto (Organisationszertifikat, typischerweise über ELSTER) und anschließend im <a href=\"https://www.portal.bsi.bund.de\" rel=\"noopener noreferrer\">BSI-Portal</a>. Hinweise des BSI: <a href=\"https://www.bsi.bund.de/DE/Themen/Regulierte-Wirtschaft/NIS-2-regulierte-Unternehmen/BSI-Portal/bsi-portal.html\" rel=\"noopener noreferrer\">Informationen zum BSI-Portal</a>.",
        "Nutzen Sie ergänzend den offiziellen <a href=\"https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/NIS-2/nis-2-betroffenheit-entscheidungsbaum.pdf\" rel=\"noopener noreferrer\">Betroffenheits-Entscheidungsbaum des BSI</a> (PDF)."
      ],
      stepsOut: [
        "Dokumentieren Sie kurz, warum Sie derzeit von keiner direkten Einordnung ausgehen, und prüfen Sie das erneut, wenn sich Größe, Tätigkeitsfeld oder ein Sonderfall ändern.",
        "Klären Sie, ob Kunden oder Auftraggeber vertragliche NIS2- oder Informationssicherheitsanforderungen an Sie als Lieferanten stellen.",
        "Der offizielle <a href=\"https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/NIS-2/nis-2-betroffenheit-entscheidungsbaum.pdf\" rel=\"noopener noreferrer\">Betroffenheits-Entscheidungsbaum des BSI</a> (PDF) kann die eigene Prüfung stützen."
      ],
      stepsUnsure: [
        "Vervollständigen Sie die offenen Angaben (Sektor, Größe, Sonderfall) und vergleichen Sie sie mit § 28 BSIG sowie den Anlagen 1 und 2.",
        "Ziehen Sie den offiziellen <a href=\"https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/NIS-2/nis-2-betroffenheit-entscheidungsbaum.pdf\" rel=\"noopener noreferrer\">Betroffenheits-Entscheidungsbaum des BSI</a> (PDF) heran. Wenn sich eine Betroffenheit bestätigt, gilt die Registrierung nach § 33 BSIG über das <a href=\"https://www.portal.bsi.bund.de\" rel=\"noopener noreferrer\">BSI-Portal</a>."
      ]
    },
    en: {
      kicker: "Result",
      why: "Why this result?",
      next: "Next steps",
      aiHeading: "Note on the AI Act (Article 4 – AI literacy)",
      aiBody: "Under Article 4 of Regulation (EU) 2024/1689 (the AI Act), providers and deployers of AI systems must, to the extent possible, take measures to ensure a sufficient level of AI literacy of their staff and of other persons dealing with AI systems on their behalf. The original obligation has applied since 2 February 2025. It does not apply to purely private use.",
      aiYes: " Your indication that AI systems are used in your organisation makes this obligation particularly relevant in practice.",
      aiNo: " The obligation is not tied to being in scope of NIS2.",
      aiSource: ' Source: official wording in the <a href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689" rel="noopener noreferrer">EU Official Journal</a>; Commission explanations in the <a href="https://digital-strategy.ec.europa.eu/en/faqs/ai-literacy-questions-answers" rel="noopener noreferrer">questions and answers on AI literacy</a>.',
      cta: "The Oxly NIS2 &amp; AI Act Readiness Kit (Version 1.1, as of November 2026) brings together an 18-page guide (PDF) and 11 templates (DOCX and XLSX) as a ZIP download. One-off purchase (€97 incl. VAT, no subscription).",
      ctaBtn: "Go to the Readiness Kit",
      printBtn: "Print result / save as PDF",
      printHint: "In your browser’s print dialog you can choose “Save as PDF”. Only the information on this page is processed; nothing is sent to us.",
      sourcesHeading: "Sources",
      sources: [
        '<a href="https://www.gesetze-im-internet.de/bsig_2025/__28.html" rel="noopener noreferrer">Section 28 BSIG</a> (besonders wichtige / wichtige Einrichtungen; particularly important and important entities)',
        '<a href="https://www.gesetze-im-internet.de/bsig_2025/__33.html" rel="noopener noreferrer">Section 33 BSIG</a> (registration)',
        '<a href="https://www.gesetze-im-internet.de/bsig_2025/anlage_1.html" rel="noopener noreferrer">Annex 1 BSIG</a> and <a href="https://www.gesetze-im-internet.de/bsig_2025/anlage_2.html" rel="noopener noreferrer">Annex 2 BSIG</a>',
        '<a href="https://www.bsi.bund.de/DE/Home/home_node.html" rel="noopener noreferrer">BSI homepage</a> (notice that the statutory registration deadline has expired, as reviewed on 11 November 2026)',
        '<a href="https://www.bsi.bund.de/DE/Themen/Regulierte-Wirtschaft/NIS-2-regulierte-Unternehmen/BSI-Portal/bsi-portal.html" rel="noopener noreferrer">BSI portal: information on registration</a>',
        '<a href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689" rel="noopener noreferrer">Regulation (EU) 2024/1689, Article 4</a>'
      ],
      disclaimer: "This check is for orientation only and is not legal advice. The result does not replace a review by the competent authority or professional legal advice.",
      stepsIn: [
        "Review the result against the official wording (section 28 BSIG and Annexes 1 and 2) and, where affiliated companies are involved, the applicable size thresholds.",
        "Particularly important and important entities must register with the BSI under section 33(1) BSIG no later than three months after they first, or once again, qualify as such. The BSI currently states that the statutory registration deadline has already expired and that in-scope entities should register in the BSI portal without delay (notice on the <a href=\"https://www.bsi.bund.de/DE/Home/home_node.html\" rel=\"noopener noreferrer\">BSI homepage</a>, as reviewed on 11 November 2026).",
        "Registration is a two-step process via Mein Unternehmenskonto (an organisation certificate, typically via ELSTER) and then the <a href=\"https://www.portal.bsi.bund.de\" rel=\"noopener noreferrer\">BSI portal</a>. BSI guidance: <a href=\"https://www.bsi.bund.de/DE/Themen/Regulierte-Wirtschaft/NIS-2-regulierte-Unternehmen/BSI-Portal/bsi-portal.html\" rel=\"noopener noreferrer\">information on the BSI portal</a>.",
        "You may also use the official <a href=\"https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/NIS-2/nis-2-betroffenheit-entscheidungsbaum.pdf\" rel=\"noopener noreferrer\">BSI scope decision tree</a> (PDF)."
      ],
      stepsOut: [
        "Briefly document why you currently assume you are not directly in scope, and revisit this if size, field of activity or a special case changes.",
        "Check whether customers or clients impose contractual NIS2 or information-security requirements on you as a supplier.",
        "The official <a href=\"https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/NIS-2/nis-2-betroffenheit-entscheidungsbaum.pdf\" rel=\"noopener noreferrer\">BSI scope decision tree</a> (PDF) can support your own review."
      ],
      stepsUnsure: [
        "Complete the outstanding information (sector, size, special case) and compare it with section 28 BSIG and Annexes 1 and 2.",
        "Consult the official <a href=\"https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/NIS-2/nis-2-betroffenheit-entscheidungsbaum.pdf\" rel=\"noopener noreferrer\">BSI scope decision tree</a> (PDF). If in-scope status is confirmed, registration under section 33 BSIG applies via the <a href=\"https://www.portal.bsi.bund.de\" rel=\"noopener noreferrer\">BSI portal</a>."
      ]
    }
  };

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function nextSteps(level, lang) {
    var ui = UI[langOf(lang)];
    if (level === "bwe" || level === "we") return ui.stepsIn;
    if (level === "nicht") return ui.stepsOut;
    return ui.stepsUnsure;
  }

  function render(box, result, opts) {
    if (!box) return;
    opts = opts || {};
    var lang = langOf(opts.lang || result.lang);
    var ui = UI[lang];
    var buyUrl = opts.buyUrl || "";
    var reasons = result.reasons.map(function (r) {
      return "<li>" + escapeHtml(r) + "</li>";
    }).join("");
    var steps = nextSteps(result.level, lang).map(function (s) {
      return "<li>" + s + "</li>";
    }).join("");
    var aiExtra = result.usesAi ? ui.aiYes : ui.aiNo;
    var sources = ui.sources.map(function (s) { return "<li>" + s + "</li>"; }).join("");
    box.innerHTML = ""
      + '<p class="section-kicker">' + escapeHtml(ui.kicker) + "</p>"
      + '<h2 class="result-title result-title--' + escapeHtml(result.level) + '">' + escapeHtml(result.title) + "</h2>"
      + "<h3>" + escapeHtml(ui.why) + "</h3>"
      + "<ul>" + reasons + "</ul>"
      + "<h3>" + escapeHtml(ui.next) + "</h3>"
      + "<ul>" + steps + "</ul>"
      + '<div class="result-note">'
      + "<h3>" + escapeHtml(ui.aiHeading) + "</h3>"
      + "<p>" + ui.aiBody + aiExtra + ui.aiSource + "</p>"
      + "</div>"
      + '<div class="result-cta no-print">'
      + "<p>" + ui.cta + "</p>"
      + '<a class="btn btn-primary btn-lg js-buy" data-buy href="' + buyUrl + '">' + escapeHtml(ui.ctaBtn) + "</a>"
      + "</div>"
      + '<div class="result-print no-print">'
      + '<button type="button" class="btn btn-secondary" id="nis2-print">' + escapeHtml(ui.printBtn) + "</button>"
      + '<p class="q-hint">' + ui.printHint + "</p>"
      + "</div>"
      + '<div class="result-sources">'
      + "<h3>" + escapeHtml(ui.sourcesHeading) + "</h3>"
      + "<ul>" + sources + "</ul>"
      + '<p class="check-disclaimer">' + ui.disclaimer + "</p>"
      + "</div>";
    box.hidden = false;
    var printBtn = document.getElementById("nis2-print");
    if (printBtn) {
      printBtn.addEventListener("click", function () { window.print(); });
    }
    if (buyUrl && typeof document !== "undefined") {
      document.querySelectorAll("[data-buy]").forEach(function (el) {
        el.setAttribute("href", buyUrl);
      });
    }
    box.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function bindForm(opts) {
    opts = opts || {};
    var lang = langOf(opts.lang);
    var buyUrl = opts.buyUrl || "";
    var form = document.getElementById("nis2-form");
    var box = document.getElementById("nis2-result");
    var resetBtn = document.getElementById("nis2-reset");
    if (!form || !box) return;
    function val(name) {
      var el = form.querySelector('[name="' + name + '"]:checked');
      return el ? el.value : "";
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!val("special") || !val("sector") || !val("employees") || !val("turnover") || !val("balance") || !val("offers")) {
        return;
      }
      var result = evaluate({
        special: val("special"),
        sector: val("sector"),
        employees: val("employees"),
        turnover: val("turnover"),
        balance: val("balance"),
        offers: val("offers"),
        usesAi: val("usesAi")
      }, lang);
      render(box, result, { buyUrl: buyUrl, lang: lang });
    });
    function clear() {
      box.hidden = true;
      box.innerHTML = "";
    }
    form.addEventListener("reset", clear);
    if (resetBtn) resetBtn.addEventListener("click", clear);
  }

  var api = {
    evaluate: evaluate,
    sizeFlags: sizeFlags,
    LEVELS: LEVELS,
    TITLES: TITLES,
    REASONS: REASONS,
    render: render,
    bindForm: bindForm
  };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.OxlyNis2 = api;
})(typeof window !== "undefined" ? window : globalThis);
