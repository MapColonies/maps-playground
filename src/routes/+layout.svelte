<script>
	import '../app.postcss';
	import { Navbar, NavBrand, NavLi, NavUl, NavHamburger } from 'flowbite-svelte';
  import {env} from '$env/dynamic/public'
</script>

<div class="flex flex-col h-screen">
	<Navbar let:hidden let:toggle>
		<NavBrand href="/">
			<span class="mr-3 h-6 sm:h-9 text-3xl">🌎</span>
			<span class="self-center whitespace-nowrap text-xl font-semibold dark:text-white">MapColonies Playground</span>
		</NavBrand>
		<NavHamburger on:click={toggle} />
		<NavUl {hidden}>
			<NavLi href="/" active={true}>Home</NavLi>
			<NavLi href={env.PUBLIC_CATALOG_HREF} target="_blank">Catalog Application</NavLi>
			<NavLi href={env.PUBLIC_DEVPORTAL_HREF} target="_blank">Developer Portal</NavLi>
			<NavLi href={env.PUBLIC_PUZZLE_HREF} target="_blank">Map Puzzle</NavLi>
		</NavUl>
	</Navbar>
	<div class="flex-auto overflow-y-auto">
		<slot />
	</div>
</div>
