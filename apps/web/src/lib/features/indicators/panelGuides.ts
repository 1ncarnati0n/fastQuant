export interface IndicatorGuide {
  summary: string;
  tip: string;
}

export const INDICATOR_GUIDES: Record<string, IndicatorGuide> = {
  bb: {
    summary: "이동평균선 ± 표준편차로 구성된 밴드",
    tip: "밴드 수축 후 확장 구간은 큰 움직임 가능성이 높습니다.",
  },
  sma: {
    summary: "단순이동평균선으로 추세 방향 확인",
    tip: "단기/중기 기간을 함께 보면 교차 신호를 읽기 쉽습니다.",
  },
  ema: {
    summary: "최근 가격 가중치가 큰 이동평균선",
    tip: "SMA 대비 반응이 빨라 단기 모멘텀 확인에 유리합니다.",
  },
  hma: {
    summary: "지연을 줄인 Hull 이동평균",
    tip: "전환이 빠른 대신 노이즈가 늘 수 있어 기간 튜닝이 중요합니다.",
  },
  donchian: {
    summary: "기간 내 최고/최저가 채널",
    tip: "상단/하단 돌파는 추세 지속 시그널로 자주 사용됩니다.",
  },
  keltner: {
    summary: "EMA ± ATR 기반 변동성 채널",
    tip: "BB와 함께 보면 스퀴즈/브레이크아웃 확인에 유용합니다.",
  },
  vwap: {
    summary: "거래량 가중 평균 가격",
    tip: "VWAP 위/아래 유지 여부로 장중 수급 우위를 판단합니다.",
  },
  volumeProfile: {
    summary: "가격대별 누적 거래량 분포",
    tip: "거래 집중 구간은 지지·저항으로 작동할 가능성이 큽니다.",
  },
  ichimoku: {
    summary: "전환선·기준선·구름대로 구성된 종합 지표",
    tip: "구름대 위/아래 위치와 구름 두께를 함께 보세요.",
  },
  supertrend: {
    summary: "ATR 기반 추세 추종 밴드",
    tip: "색상 전환 시점을 추세 전환 신호로 해석할 수 있습니다.",
  },
  parabolicSar: {
    summary: "추세 전환 가능 지점을 점으로 표시",
    tip: "점이 가격 위/아래로 바뀌는 시점을 체크하세요.",
  },
  autoFib: {
    summary: "스윙 기반 자동 피보나치 레벨",
    tip: "0.382/0.5/0.618 구간 반응을 우선 확인하세요.",
  },
  smc: {
    summary: "구조 전환(BOS/CHoCH) 기반 분석",
    tip: "스윙 길이를 조절해 신호 빈도와 노이즈를 맞추세요.",
  },
  volume: {
    summary: "봉별 거래량 패널",
    tip: "가격 방향과 거래량 증가가 같이 나오면 신호 신뢰도가 올라갑니다.",
  },
  rsi: {
    summary: "상대강도지수(0~100)",
    tip: "70/30 구간 과열·침체와 다이버전스를 함께 보세요.",
  },
  macd: {
    summary: "추세 모멘텀과 시그널 교차",
    tip: "히스토그램 기울기 변화가 선행 신호로 자주 작동합니다.",
  },
  stochastic: {
    summary: "범위 대비 현재가 위치",
    tip: "K/D 교차와 80/20 구간 이탈을 함께 보세요.",
  },
  showObv: {
    summary: "거래량 누적 흐름",
    tip: "가격과 OBV의 방향 불일치는 다이버전스로 해석할 수 있습니다.",
  },
  mfi: {
    summary: "거래량 가중 RSI",
    tip: "RSI보다 거래량 반영도가 높아 과매수·과매도 해석이 보완됩니다.",
  },
  cmf: {
    summary: "Chaikin Money Flow",
    tip: "0선 위/아래 유지로 자금 유입·유출 흐름을 판단합니다.",
  },
  adx: {
    summary: "추세 강도(방향성 제외)",
    tip: "ADX 20~25 상향 돌파 시 추세 강화 가능성을 봅니다.",
  },
  showCvd: {
    summary: "누적 거래량 델타",
    tip: "가격과 CVD가 다르게 움직이면 수급 괴리를 의심할 수 있습니다.",
  },
  stc: {
    summary: "MACD + 사이클 기반 오실레이터",
    tip: "급격한 반전 구간에서 조기 추세 전환 탐지에 사용됩니다.",
  },
  atr: {
    summary: "평균 변동폭",
    tip: "손절 폭, 포지션 크기 조절에 직접 활용하기 좋습니다.",
  },
};
