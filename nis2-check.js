/**
 * Oxly NIS2-Schnellcheck — reine Client-Logik, keine Netzwerkanfragen.
 * Grundlage: BSIG 2025 (§ 28, Anlagen 1 und 2), Stand der Einsichtnahme: 11. November 2026.
 */
(function (root) {
  "use strict";

  var LEVELS = {
    bwe: "Voraussichtlich besonders wichtige Einrichtung",
    we: "Voraussichtlich wichtige Einrichtung",
    nicht: "Voraussichtlich nicht direkt betroffen – aber evtl. indirekt über Kunden/Lieferkette",
    pruefung: "Weitere Prüfung erforderlich"
  };

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

  function evaluate(answers) {
    var special = answers.special || "";
    var sector = answers.sector || "";
    var size = sizeFlags(answers.employees, answers.turnover, answers.balance);
    var reasons = [];
    var level = "pruefung";
    var byAnnex = annexLevel(sector, size);

    if (special === "kritis") {
      level = "bwe";
      reasons.push("Betreiber kritischer Anlagen (KRITIS) gelten nach § 28 Abs. 1 Nr. 1 BSIG unabhängig von der Unternehmensgröße als besonders wichtige Einrichtungen.");
    } else if (special === "qualified_dns_tld") {
      level = "bwe";
      reasons.push("Qualifizierte Vertrauensdiensteanbieter, TLD-Registries und DNS-Diensteanbieter gelten nach § 28 Abs. 1 Nr. 2 BSIG unabhängig von der Unternehmensgröße als besonders wichtige Einrichtungen.");
    } else if (special === "telecom") {
      if (size.medium || size.large) {
        level = "bwe";
        reasons.push("Anbieter öffentlich zugänglicher Telekommunikationsdienste bzw. Betreiber öffentlicher Telekommunikationsnetze gelten nach § 28 Abs. 1 Nr. 3 BSIG als besonders wichtige Einrichtungen, wenn sie mindestens 50 Beschäftigte haben oder Jahresumsatz und Jahresbilanzsumme jeweils 10 Millionen Euro übersteigen.");
      } else if (size.clearlySmall) {
        level = "we";
        reasons.push("Kleinere Telekommunikationsanbieter bzw. -netzbetreiber unterhalb der Schwellen des § 28 Abs. 1 Nr. 3 BSIG gelten nach § 28 Abs. 2 Nr. 2 BSIG als wichtige Einrichtungen.");
      } else {
        level = "pruefung";
        reasons.push("Bei Telekommunikationsanbietern entscheidet die Größe über die Einstufung als besonders wichtige (§ 28 Abs. 1 Nr. 3 BSIG) oder wichtige Einrichtung (§ 28 Abs. 2 Nr. 2 BSIG). Die vorliegenden Größenangaben reichen für eine vorläufige Zuordnung nicht aus.");
      }
    } else if (special === "trust_other") {
      if (byAnnex === "bwe") {
        level = "bwe";
        reasons.push("Neben der Stellung als (nicht qualifizierter) Vertrauensdiensteanbieter erfüllen die Angaben auch die Größen- und Sektorschwellen für besonders wichtige Einrichtungen nach § 28 Abs. 1 Nr. 4 BSIG.");
      } else {
        level = "we";
        reasons.push("Vertrauensdiensteanbieter, die nicht unter § 28 Abs. 1 Nr. 2 BSIG fallen, gelten nach § 28 Abs. 2 Nr. 1 BSIG unabhängig von der Unternehmensgröße als wichtige Einrichtungen.");
      }
    } else {
      if (special === "unsure") {
        reasons.push("Ob ein besonderer gesetzlicher Fall vorliegt (etwa KRITIS, qualifizierte Vertrauensdienste, DNS/TLD oder Telekommunikation), ist noch unsicher und sollte gesondert geprüft werden.");
      }

      if (answers.offers === "no" && special === "none" && (sector === "annex1" || sector === "annex2")) {
        level = "pruefung";
        reasons.push("Die sektoralen Schwellen des § 28 Abs. 1 Nr. 4 und Abs. 2 Nr. 3 BSIG knüpfen daran, dass Waren oder Dienstleistungen angeboten werden. Ihre Angaben dazu weichen von der Sektorzuordnung ab; eine Einzelfallprüfung ist sinnvoll.");
      } else if (special === "unsure") {
        if (byAnnex === "bwe") {
          level = "bwe";
          reasons.push("Nach Sektor und Größe wäre voraussichtlich eine besonders wichtige Einrichtung anzunehmen (§ 28 Abs. 1 Nr. 4 BSIG). Ein zusätzlicher Sonderfall könnte das Ergebnis bestätigen, ändert die vorläufige Höherstufung aber typischerweise nicht.");
        } else {
          level = "pruefung";
          if (byAnnex === "we") {
            reasons.push("Nach Sektor und Größe wäre voraussichtlich mindestens eine wichtige Einrichtung anzunehmen. Ein noch ungeklärter Sonderfall (etwa KRITIS oder qualifizierte Vertrauensdienste) könnte zu einer höheren Einstufung führen.");
          } else if (byAnnex === "nicht") {
            reasons.push("Ohne Sonderfall und unterhalb der Schwellen oder außerhalb der Anlagen 1 und 2 wäre voraussichtlich keine direkte Betroffenheit anzunehmen. Ein noch ungeklärter Sonderfall kann das Ergebnis ändern.");
          } else {
            reasons.push("Sektor und/oder Größe sind nicht eindeutig genug für eine vorläufige Zuordnung.");
          }
        }
      } else {
        level = byAnnex;
        if (sector === "annex1") {
          if (size.large) {
            reasons.push("Im Sektor hoher Kritikalität (Anlage 1 BSIG) und bei Erreichen der Schwellen für große Unternehmen (§ 28 Abs. 1 Nr. 4 BSIG: mindestens 250 Beschäftigte oder Jahresumsatz über 50 Millionen Euro und Jahresbilanzsumme über 43 Millionen Euro) ist voraussichtlich eine besonders wichtige Einrichtung anzunehmen.");
          } else if (size.medium) {
            reasons.push("Im Sektor hoher Kritikalität (Anlage 1 BSIG) und bei Erreichen der mittleren Schwellen (§ 28 Abs. 2 Nr. 3 BSIG: mindestens 50 Beschäftigte oder Jahresumsatz und Jahresbilanzsumme jeweils über 10 Millionen Euro), ohne die Schwellen für besonders wichtige Einrichtungen zu erfüllen, ist voraussichtlich eine wichtige Einrichtung anzunehmen.");
          } else if (size.clearlySmall) {
            reasons.push("Auch bei einem Tätigkeitsfeld nach Anlage 1 BSIG liegen die vorliegenden Größenangaben unter den Schwellen des § 28 BSIG. Voraussichtlich besteht keine direkte Einordnung als besonders wichtige oder wichtige Einrichtung.");
          } else {
            reasons.push("Der Sektor nach Anlage 1 BSIG ist angegeben, die Größenangaben reichen aber nicht aus, um zwischen besonders wichtiger Einrichtung, wichtiger Einrichtung und Nichtbetroffenheit zu unterscheiden.");
          }
        } else if (sector === "annex2") {
          if (size.medium || size.large) {
            reasons.push("In einem Sektor nach Anlage 2 BSIG führen die mittleren oder großen Schwellen nach § 28 Abs. 2 Nr. 3 BSIG voraussichtlich zu einer wichtigen Einrichtung. Eine Einstufung als besonders wichtige Einrichtung ergibt sich aus der Größe in Anlage-2-Sektoren allein nicht.");
          } else if (size.clearlySmall) {
            reasons.push("Auch bei einem Tätigkeitsfeld nach Anlage 2 BSIG liegen die vorliegenden Größenangaben unter den Schwellen des § 28 BSIG. Voraussichtlich besteht keine direkte Einordnung als wichtige Einrichtung.");
          } else {
            reasons.push("Der Sektor nach Anlage 2 BSIG ist angegeben, die Größenangaben reichen aber nicht aus, um zwischen wichtiger Einrichtung und Nichtbetroffenheit zu unterscheiden.");
          }
        } else if (sector === "none") {
          reasons.push("Ohne Zuordnung zu Anlage 1 oder 2 BSIG und ohne besonderen gesetzlichen Fall ist voraussichtlich keine direkte Betroffenheit als besonders wichtige oder wichtige Einrichtung anzunehmen.");
        } else if (sector === "unsure") {
          if (size.clearlySmall) {
            reasons.push("Selbst wenn ein Sektor der Anlagen 1 oder 2 vorläge, lägen die Größenangaben unter den gesetzlichen Schwellen. Voraussichtlich besteht keine direkte Betroffenheit, sofern kein Sonderfall greift.");
          } else if (size.large) {
            reasons.push("Bei großen Unternehmen kann je nach Sektor eine besonders wichtige (Anlage 1) oder wichtige Einrichtung (Anlage 2) in Betracht kommen. Die Sektorzuordnung sollte geprüft werden.");
          } else if (size.medium) {
            reasons.push("Bei Erreichen der mittleren Schwellen kann je nach Sektor eine wichtige Einrichtung in Betracht kommen. Die Sektorzuordnung sollte geprüft werden.");
          } else {
            reasons.push("Sektor und Größe sind nicht eindeutig genug für eine vorläufige Zuordnung.");
          }
        }
      }
    }

    if (level === "nicht") {
      reasons.push("Auch ohne direkte Regulierung können Kunden oder Auftraggeber, die selbst unter das BSIG fallen, vertragliche Sicherheitsanforderungen in der Lieferkette stellen.");
    }

    return {
      level: level,
      title: LEVELS[level] || LEVELS.pruefung,
      reasons: reasons,
      size: size,
      usesAi: answers.usesAi === "yes"
    };
  }

  var api = { evaluate: evaluate, sizeFlags: sizeFlags, LEVELS: LEVELS };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.OxlyNis2 = api;
})(typeof window !== "undefined" ? window : globalThis);
