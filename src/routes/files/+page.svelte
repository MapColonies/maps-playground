<script lang="ts">
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';

  export let data;
  
</script>

<Table striped={true}>
  <TableHead>
    <TableHeadCell>File Name</TableHeadCell>
    <TableHeadCell>File Local Path</TableHeadCell>
    <TableHeadCell>Relative App Path</TableHeadCell>
    <TableHeadCell>
      <span class="sr-only"> Link </span>
    </TableHeadCell>
  </TableHead>
  <TableBody tableBodyClass="divide-y">
    {#each data.files as file}
    <TableBodyRow>
      <TableBodyCell>{file.name}</TableBodyCell>
      <TableBodyCell>{file.path}</TableBodyCell>
      <TableBodyCell>{file.urlPath}</TableBodyCell>
      <TableBodyCell>
        <a href="{file.urlPath}" class="font-medium text-blue-600 hover:underline dark:text-blue-500">
          Link
        </a>
      </TableBodyCell>
    </TableBodyRow>
	{/each}
  </TableBody>
</Table>