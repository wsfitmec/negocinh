const telaCoracao = document.getElementById("tela-coracao");
const botaoAbrir = document.getElementById("abrir");
const botaoSurpresa = document.getElementById("surpresa");
const areaCoracao = document.getElementById("coracao");

const idiomas = [
  "Eu te amo", "I love you", "Je t'aime", "Ti amo", "Te amo",
  "Ich liebe dich", "Ik hou van jou", "愛してる", "사랑해", "我爱你",
  "Я тебя люблю", "Seni seviyorum", "Aku cinta kamu", "ฉันรักคุณ",
  "Σ' αγαπώ", "Kocham cię", "Anh yêu em", "Jag älskar dig",
  "Mahal kita", "Te iubesc"
];

// Silhueta matemática de um coração, usada para calcular cada fileira.
function dentroDoCoracao(x, y) {
  return (x * x + y * y - 1) ** 3 - x * x * y ** 3 <= 0;
}

function intervalosDaLinha(y) {
  const xMin = -1.08;
  const xMax = 1.08;
  const passo = 0.0025;
  const intervalos = [];
  let inicio = null;
  let anteriorDentro = false;

  for (let x = xMin; x <= xMax + passo / 2; x += passo) {
    const dentro = dentroDoCoracao(x, y);
    if (dentro && !anteriorDentro) inicio = x;
    if (!dentro && anteriorDentro && inicio !== null) {
      intervalos.push([inicio, x - passo]);
      inicio = null;
    }
    anteriorDentro = dentro;
  }
  if (anteriorDentro && inicio !== null) intervalos.push([inicio, xMax]);
  return intervalos;
}

const medidor = document.createElement("canvas").getContext("2d");
const cacheLarguras = new Map();

function frasesMedidas(tamanhoFonte) {
  const chave = tamanhoFonte.toFixed(1);
  if (cacheLarguras.has(chave)) return cacheLarguras.get(chave);

  medidor.font = `700 ${tamanhoFonte}px Arial, Helvetica, sans-serif`;
  const lista = idiomas
    .map(texto => ({ texto, largura: medidor.measureText(texto).width }))
    .sort((a, b) => b.largura - a.largura);

  cacheLarguras.set(chave, lista);
  return lista;
}

function adicionarPalavra(linha, texto, tamanhoFonte, progressoY, distanciaBorda, ehContorno) {
  const span = document.createElement("span");
  span.className = "palavra";
  span.textContent = texto;
  span.style.fontSize = `${tamanhoFonte}px`;
  span.dataset.progressoY = progressoY.toFixed(4);
  span.dataset.contorno = String(ehContorno);
  span.dataset.distanciaBorda = String(distanciaBorda);
  linha.appendChild(span);
}

function criarPalavrasNaLinha(linha, larguraPx, tamanhoFonte, progressoY) {
  // Espaçamento pequeno e uniforme: mantém as frases legíveis sem deixar buracos.
  const gap = Math.max(1.5, Math.min(4.2, tamanhoFonte * 0.34));
  linha.style.gap = `${gap}px`;

  // Nas pontas muito estreitas do coração, usar um detalhe pequeno evita fileiras vazias.
  if (larguraPx < 27) {
    if (larguraPx >= 9) {
      const texto = larguraPx < 17 ? "♡" : "amo";
      const fonte = Math.max(5, Math.min(7, larguraPx * (texto === "♡" ? 0.55 : 0.24)));
      adicionarPalavra(linha, texto, fonte, progressoY, 0, true);
    }
    return;
  }

  const candidatos = frasesMedidas(tamanhoFonte);
  const alvo = larguraPx * 0.965;
  const frases = [];
  let ocupado = 0;
  let seguranca = 0;

  // Preenche quase toda a largura da fileira, sem o espaçamento exagerado da versão anterior.
  while (ocupado < alvo && seguranca < 60) {
    seguranca++;
    const espacoAntes = frases.length ? gap : 0;
    const restante = alvo - ocupado - espacoAntes;
    const queCabem = candidatos.filter(item => item.largura <= restante);
    if (!queCabem.length) break;

    // Escolhe entre frases largas que cabem; se sobrar um trecho pequeno,
    // o próximo ciclo tenta uma frase menor para preencher o espaço.
    const larguraMaior = queCabem[0].largura;
    const faixa = queCabem.filter(item => item.largura >= larguraMaior * 0.72).slice(0, 6);
    const escolhido = faixa[Math.floor(Math.random() * faixa.length)] || queCabem[0];

    frases.push(escolhido);
    ocupado += espacoAntes + escolhido.largura;
  }

  // Uma linha curta ainda recebe uma frase, em vez de deixar um buraco visível.
  if (!frases.length) {
    const curta = candidatos.filter(item => item.largura <= larguraPx * 0.94).slice(-1)[0];
    if (curta) frases.push(curta);
  }
  if (!frases.length) return;

  linha.classList.toggle("poucas-palavras", frases.length < 3);
  linha.style.justifyContent = "space-between";

  frases.forEach((item, indice) => {
    const distanciaBorda = Math.min(indice, frases.length - 1 - indice);
    const ehContorno = indice === 0 || indice === frases.length - 1;
    adicionarPalavra(linha, item.texto, tamanhoFonte, progressoY, distanciaBorda, ehContorno);
  });
}

function criarCoracao() {
  areaCoracao.replaceChildren();
  areaCoracao.classList.remove("completo");

  const retangulo = areaCoracao.getBoundingClientRect();
  const largura = retangulo.width;
  const xMin = -1.08;
  const xMax = 1.08;
  // Inclui os dois lobos superiores e a ponta inferior inteira do coração.
  const yTopo = 1.235;
  const yBase = -1.00;
  const quantidadeFileiras = Math.max(31, Math.min(41, Math.round(retangulo.height / 14)));
  const alturaMatematica = yTopo - yBase;
  const fragmento = document.createDocumentFragment();

  for (let indiceLinha = 0; indiceLinha < quantidadeFileiras; indiceLinha++) {
    const y = yTopo - indiceLinha * alturaMatematica / (quantidadeFileiras - 1);
    const intervalos = intervalosDaLinha(y);
    const progressoY = (yTopo - y) / alturaMatematica;
    const topPct = progressoY * 100;

    intervalos.forEach(([esquerda, direita]) => {
      const larguraNormalizada = direita - esquerda;
      const larguraPx = (larguraNormalizada / (xMax - xMin)) * largura;
      if (larguraPx < 8) return;

      const linha = document.createElement("div");
      linha.className = "heart-row";
      linha.style.left = `${((esquerda - xMin) / (xMax - xMin)) * 100}%`;
      linha.style.width = `${(larguraNormalizada / (xMax - xMin)) * 100}%`;
      linha.style.top = `${topPct}%`;

      // Mantém o texto proporcional à largura disponível em cada fileira.
      const tamanhoFonte = Math.max(6.2, Math.min(11.2, larguraPx * 0.025));
      criarPalavrasNaLinha(linha, larguraPx, tamanhoFonte, progressoY);
      if (linha.children.length) fragmento.appendChild(linha);
    });
  }

  areaCoracao.appendChild(fragmento);
  requestAnimationFrame(() => requestAnimationFrame(animarFrasesParaOCoracao));
}

function animarFrasesParaOCoracao() {
  const palavras = [...areaCoracao.querySelectorAll(".palavra")];
  const retangulo = areaCoracao.getBoundingClientRect();
  const centroX = retangulo.left + retangulo.width / 2;
  const centroY = retangulo.top + retangulo.height / 2;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    palavras.forEach(palavra => palavra.classList.add("pronta"));
    areaCoracao.classList.add("completo");
    return;
  }

  // Faz uma única leitura das posições finais, antes de iniciar as animações.
  const medidas = palavras.map(palavra => {
    const pos = palavra.getBoundingClientRect();
    return {
      palavra,
      x: pos.left + pos.width / 2,
      y: pos.top + pos.height / 2,
      ehContorno: palavra.dataset.contorno === "true",
      distanciaBorda: Number(palavra.dataset.distanciaBorda),
      progressoY: Number(palavra.dataset.progressoY)
    };
  });

  // 1) Primeiro, percorremos o contorno do coração em ordem de perímetro.
  const bordas = medidas.filter(item => item.ehContorno).sort((a, b) => {
    const anguloA = Math.atan2(a.y - centroY, a.x - centroX);
    const anguloB = Math.atan2(b.y - centroY, b.x - centroX);
    const voltaA = (anguloA + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI);
    const voltaB = (anguloB + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI);
    return voltaA - voltaB;
  });

  const ordemBordas = new Map(bordas.map((item, indice) => [item.palavra, indice]));
  const totalBordas = Math.max(1, bordas.length - 1);

  // 2) Depois, o preenchimento progride fileira a fileira e das bordas para o centro.
  // Isso evita que centenas de animações comecem no mesmo instante.
  const movimentos = medidas.map(item => {
    const { palavra, x, y, ehContorno, distanciaBorda, progressoY } = item;
    const dxCentro = x - centroX;
    const dyCentro = y - centroY;

    let atraso;
    let duracao;

    if (ehContorno) {
      atraso = (ordemBordas.get(palavra) / totalBordas) * 1.55;
      duracao = 0.72 + Math.random() * 0.08;
    } else {
      // O interior só começa quando o contorno está praticamente pronto.
      // A pequena progressão vertical evita um pico de trabalho no meio da animação.
      atraso = 2.42 + progressoY * 1.0 + distanciaBorda * 0.052 + Math.random() * 0.025;
      duracao = 0.62 + Math.random() * 0.10;
    }

    // Distância curta: as frases vêm para o lugar sem voar excessivamente pela tela.
    const distancia = 24 + Math.random() * 28;
    const direcao = Math.atan2(dyCentro, dxCentro) + (Math.random() - 0.5) * 0.65;
    const dx = Math.cos(direcao) * distancia;
    const dy = Math.sin(direcao) * distancia;
    const rotacao = Math.random() * 6 - 3;

    return { palavra, atraso, duracao, dx, dy, rotacao };
  }).sort((a, b) => a.atraso - b.atraso);

  movimentos.forEach(({ palavra, atraso, duracao, dx, dy, rotacao }) => {
    // Cria a animação apenas quando é hora de começar; animações futuras não ficam
    // todas ativas em estado de espera, reduzindo trabalho e memória do navegador.
    window.setTimeout(() => {
      palavra.classList.add("montando");

      const animacao = palavra.animate([
        {
          transform: `translate3d(${dx}px, ${dy}px, 0) scale(.78) rotate(${rotacao}deg)`,
          opacity: 0
        },
        {
          transform: "translate3d(0, 0, 0) scale(1) rotate(0deg)",
          opacity: 1
        }
      ], {
        duration: duracao * 1000,
        easing: "cubic-bezier(.22, 1, .36, 1)",
        fill: "forwards"
      });

      animacao.onfinish = () => {
        // Congela o estado final e libera o objeto de animação para não acumular efeitos.
        palavra.style.opacity = "1";
        palavra.style.transform = "translate3d(0, 0, 0) scale(1) rotate(0deg)";
        palavra.classList.remove("montando");
        palavra.classList.add("pronta");
        animacao.cancel();
      };
    }, atraso * 1000);
  });

  // Só ativa o acabamento depois da última frase terminar.
  const ultimoMovimento = Math.max(...movimentos.map(item => item.atraso + item.duracao));
  window.setTimeout(() => areaCoracao.classList.add("completo"), (ultimoMovimento + 0.15) * 1000);
}

function mostrarTela(telaEscolhida) {
  document.querySelectorAll(".tela").forEach(tela => tela.classList.remove("ativa"));
  telaEscolhida.classList.add("ativa");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

let coracaoIniciado = false;
botaoAbrir.addEventListener("click", () => {
  mostrarTela(telaCoracao);
  if (!coracaoIniciado) {
    coracaoIniciado = true;
    requestAnimationFrame(criarCoracao);
  }
});

botaoSurpresa.addEventListener("click", () => mostrarTela(document.getElementById("tela-mensagem")));

// Recalcula somente se a largura mudar bastante (por exemplo, ao girar o celular).
let larguraAnterior = 0;
window.addEventListener("resize", () => {
  if (!telaCoracao.classList.contains("ativa")) return;
  const novaLargura = Math.round(areaCoracao.getBoundingClientRect().width);
  if (larguraAnterior && Math.abs(novaLargura - larguraAnterior) > 50) {
    criarCoracao();
  }
  larguraAnterior = novaLargura;
});
