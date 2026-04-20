<script lang="ts">
  import ApiStatus from "$lib/components/ApiStatus.svelte";
</script>

<main class="shell">
  <section class="intro">
    <p class="eyebrow">fastQuant migration</p>
    <h1>SvelteKit UI, FastAPI business backend</h1>
    <p>
      Dashboard, watchlist, and strategy screens will move here while market data,
      indicators, signals, and backtests move into FastAPI.
    </p>
    <nav>
      <a href="/dashboard">Dashboard</a>
      <a href="/strategy">Strategy Lab</a>
    </nav>
  </section>

  <ApiStatus />
</main>

<style>
  .shell {
    min-height: 100vh;
    display: grid;
    gap: 24px;
    align-content: center;
    padding: 48px;
  }

  .intro {
    max-width: 760px;
  }

  .eyebrow {
    margin: 0 0 12px;
    color: #2b6f6c;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-size: clamp(2.25rem, 7vw, 5.5rem);
    line-height: 0.95;
  }

  p {
    max-width: 620px;
    line-height: 1.65;
  }

  nav {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 28px;
  }

  a {
    border: 1px solid #151515;
    border-radius: 8px;
    padding: 10px 14px;
    text-decoration: none;
    background: #ffffff;
  }

  @media (max-width: 640px) {
    .shell {
      padding: 28px 18px;
    }
  }
</style>

