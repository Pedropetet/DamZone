// Vereist: beide servers draaien + admin-gebruiker aangemaakt via seed

describe("Lobby & Admin-panel", () => {
  beforeEach(() => {
    cy.login("admin", "Admin1234!");
    cy.url().should("include", "/home");
  });

  it("toont de 'Zoek tegenstander'-knop op de homepagina", () => {
    cy.contains("Zoek tegenstander").should("be.visible");
  });

  it("toont een wacht-indicator na klikken op 'Zoek tegenstander'", () => {
    cy.contains("Zoek tegenstander").click();
    cy.contains("Wachten op tegenstander").should("be.visible");
    cy.contains("Annuleren").click();
  });

  it("navigeert naar het admin-panel via de Admin-link", () => {
    cy.contains("Admin").click();
    cy.url().should("include", "/admin");
    cy.contains("Gebruikers").should("be.visible");
  });

  it("toont gebruikerslijst in het admin-panel", () => {
    cy.visit("/admin");
    // scrollBehavior: false voorkomt dat Cypress #root.scrollTop verhoogt
    // waardoor de tab-knop achter de sticky header verdwijnt
    cy.contains("Gebruikers").click({ scrollBehavior: false });
    cy.get("table").should("exist");
    cy.contains("admin").should("be.visible");
  });
});
