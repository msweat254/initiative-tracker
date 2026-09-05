<script lang="ts">
    export let open: boolean;
</script>

<details {open} on:toggle>
    <summary class="summary">
        <slot name="title" />
        <div class="collapser">
            <div class="handle" />
        </div>
    </summary>
    <slot name="content" />
</details>

<style scoped>
    details > summary.summary {
        outline: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.25rem;
        list-style: none;
        list-style-type: none;
        min-height: 1rem;
        border-top-left-radius: 0.1rem;
        border-top-right-radius: 0.1rem;
        cursor: pointer;
        position: relative;
        margin-bottom: 1rem;
        border-bottom: 1px solid var(--background-modifier-border);
    }

    details > summary.summary::-webkit-details-marker,
    details > summary.summary::marker {
        display: none;
    }

    details > summary.summary > .collapser {
        position: relative;
        display: flex;
        align-items: center;
    }

    details > summary.summary .collapser > .handle {
        transform: rotate(0deg);
        transition: transform 0.25s;
        background-color: currentColor;
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
        -webkit-mask-size: contain;
        mask-size: contain;
        -webkit-mask-image: var(--admonition-details-icon);
        mask-image: var(--admonition-details-icon);
        width: 20px;
        height: 20px;
    }

    details[open] > summary.summary .collapser > .handle {
        transform: rotate(90deg);
    }
</style>
