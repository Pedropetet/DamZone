// Vereist: dev-server (npm run dev) én back-end (npm run dev:server) draaien
// Start met een verse database of gebruik een testgebruiker

describe("Authenticatie", () => {
  it("toont de loginpagina bij bezoek aan /", () => {
    cy.visit("/");
    cy.contains("Inloggen").should("be.visible");
  });

  it("toont een foutmelding bij ongeldige inloggegevens", () => {
    cy.visit("/");
    cy.get('input[name="username"]').type("bestaatNiet");
    cy.get('input[name="password"]').type("FoutWachtwoord1!");
    cy.get('button[type="submit"]').click();
    cy.contains("Ongeldige").should("be.visible");
  });

  it("navigeert naar /register via de registratielink", () => {
    cy.visit("/");
    cy.get('a[href="/register"]').click();
    cy.url().should("include", "/register");
    cy.contains("Registreren").should("be.visible");
  });

  it("toont een foutmelding bij te korte gebruikersnaam tijdens registratie", () => {
    cy.visit("/register");
    cy.get('input[name="username"]').type("ab");
    cy.get('input[name="email"]').type("test@example.com");
    cy.get('input[name="password"]').type("Wachtwoord1!");
    cy.get('button[type="submit"]').click();
    cy.contains("minimaal").should("be.visible");
  });

  it("logt in als admin en ziet de Admin-link", () => {
    // Dit vereist dat de admin-gebruiker bestaat (via seed-script)
    cy.login("admin", "Admin1234!");
    cy.url().should("include", "/home");
    cy.contains("Admin").should("be.visible");
  });

  it("logt uit en keert terug naar de loginpagina", () => {
    cy.login("admin", "Admin1234!");
    cy.url().should("include", "/home");
    cy.contains("Uitloggen").click();
    cy.url().should("eq", `${Cypress.config("baseUrl")}/`);
  });
});
