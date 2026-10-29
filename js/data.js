/**
 * Conteúdo do portal. Edite aqui nomes, ícones e links — o app.js monta a página a partir deste arquivo.
 *
 * Ícones: classes do Font Awesome 6 (https://fontawesome.com/search?o=r&m=free).
 * Linhas do card: string = texto normal; { i: "texto" } = texto em itálico.
 * href: destino do card. Sem href, usa DEFAULT_HREF.
 */
(function () {
  "use strict";

  var DEFAULT_HREF = "https://www.unip.br/aluno/central/sistemas";

  window.PORTAL_DATA = {
    defaultHref: DEFAULT_HREF,

    user: {
      name: "Felipe Matheus P dos Santos",
      email: "felipe.santos198@aluno.unip.br"
    },

    links: {
      profile: DEFAULT_HREF,
      logout: "https://www.unip.br/",
      privacy: "https://www.unip.br/"
    },

    sections: [
      {
        id: "documentos",
        title: "Documentos e Identificação",
        icon: "fa-solid fa-id-card",
        cards: [
          { lines: ["Documentos do Aluno"], icon: "fa-solid fa-id-card", featured: true },
          { lines: ["Carteirinha"], icon: "fa-regular fa-address-card" }
        ]
      },
      {
        id: "atendimento",
        title: "Atendimento",
        icon: "fa-solid fa-headset",
        cards: [{ lines: ["Ouvidoria"], icon: "fa-solid fa-headset" }]
      },
      {
        id: "secretaria",
        title: "Secretaria e Serviços",
        icon: "fa-solid fa-building",
        cards: [
          {
            lines: ["Inteligência da Empregabilidade"],
            icon: "fa-solid fa-user-tie",
            featured: true,
            badge: "Análise sobre a sua formação"
          },
          { lines: ["Office"], icon: "fa-brands fa-windows" },
          { lines: ["Calendário"], icon: "fa-regular fa-calendar-days" },
          { lines: ["Secretaria", { i: "On-line" }], icon: "fa-solid fa-headset" }
        ]
      },
      {
        id: "academico",
        title: "Acadêmico",
        icon: "fa-solid fa-graduation-cap",
        cards: [
          { lines: ["Disciplina", { i: "On-line" }], icon: "fa-solid fa-laptop-file" },
          {
            lines: ["Trabalhos Acadêmicos", "(APS, Estágio, PIM)"],
            icon: "fa-solid fa-chalkboard-user",
            href: "trabalhos-academicos.html"
          },
          { lines: ["Atividades Complementares"], icon: "fa-solid fa-chalkboard-user" },
          {
            lines: ["Sistema", { i: "On-line" }, "de Revisão Básica de Conteúdos"],
            icon: "fa-solid fa-computer"
          }
        ]
      },
      {
        id: "estagio",
        title: "Estágio",
        icon: "fa-solid fa-briefcase",
        cards: [
          { lines: ["Procedimentos e Orientações de Estágio"], icon: "fa-solid fa-list-ul" },
          { lines: ["Postagem de Documentos de Estágio"], icon: "fa-solid fa-file-signature" }
        ]
      },
      {
        id: "bibliotecas",
        title: "Bibliotecas e Conteúdo",
        icon: "fa-solid fa-book",
        cards: [
          { lines: ["Minha Biblioteca"], icon: "fa-solid fa-book-open-reader" },
          { lines: ["Biblioteca Virtual"], icon: "fa-solid fa-house-laptop" }
        ]
      },
      {
        id: "eventos",
        title: "Eventos",
        icon: "fa-regular fa-calendar",
        cards: [
          { lines: ["Feira do Futuro Profissional 2026"], icon: "fa-solid fa-briefcase" },
          { lines: ["Vídeos de Procedimentos Acadêmicos"], icon: "fa-solid fa-display" },
          { lines: ["Eventos", { i: "On-line" }], icon: "fa-solid fa-video" }
        ]
      },
      {
        id: "internacionalizacao",
        title: "Internacionalização e Parcerias",
        icon: "fa-solid fa-earth-americas",
        cards: [
          { lines: ["Capacitação em Internacionalização Acadêmica"], icon: "fa-solid fa-earth-americas" },
          { lines: ["Ação de Cadastramento – Agentes de Integração"], icon: "fa-solid fa-file-pen" },
          {
            lines: ["Iniciação Científica e de Desenvolvimento Tecnológico e Inovação"],
            icon: "fa-solid fa-clipboard-check"
          }
        ]
      }
    ],

    // Itens do menu que não são seções da página (abrem um link).
    extraMenu: [{ label: "Pesquisa CPA", icon: "fa-solid fa-square-poll-vertical", href: DEFAULT_HREF }],

    // Página "Trabalhos Acadêmicos" (trabalhos-academicos.html).
    trabalhos: {
      maxSizeMB: 20,
      // Mensagem exibida em "Para entregar" quando não há trabalho pendente.
      emptyPending: "Aguarde a abertura da campanha de entrega.",
      emptyDone: "Nenhum trabalho entregue até o momento.",
      assignments: [
        {
          id: "tc1",
          title: "Trabalho de Conclusão de Curso 1 - TC1",
          type: "TCC",
          description: "Envie o arquivo final do seu trabalho em formato PDF."
        }
      ]
    }
  };
})();
