import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Box, 
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel,
  VStack,
  HStack,
  Input,
  Select,
  Button,
  Text,
  Badge,
  useDisclosure
} from '@chakra-ui/react';
import { SearchIcon, FilterIcon } from '@chakra-ui/icons';
import ContentTable from '../components/Content/ContentTable';
import ContentModal from '../components/Content/ContentModal';
import AdvancedFilters from '../components/Content/AdvancedFilters';
import { contentService } from '../services/contentService';
import { ContentItem, ContentFilters } from '../types/content';

const Content: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [filters, setFilters] = useState<ContentFilters>({
    search: '',
    genre: '',
    year: '',
    quality: '',
    language: '',
    page: 1,
    limit: 50
  });
  
  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
  const { isOpen: isFiltersOpen, onOpen: onFiltersOpen, onClose: onFiltersClose } = useDisclosure();
  
  const contentTypes = ['movies', 'series', 'channels'];
  const currentType = contentTypes[activeTab];
  
  // Fetch content based on current tab and filters
  const { data: contentData, isLoading, error, refetch } = useQuery({
    queryKey: ['content', currentType, filters],
    queryFn: () => contentService.getContent(currentType, filters),
    keepPreviousData: true
  });
  
  // Get unique filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['content-filters', currentType],
    queryFn: () => contentService.getFilterOptions(currentType),
    staleTime: 10 * 60 * 1000 // 10 minutes
  });
  
  const handleContentClick = (content: ContentItem) => {
    setSelectedContent(content);
    onModalOpen();
  };
  
  const handleFilterChange = (newFilters: Partial<ContentFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };
  
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };
  
  const clearFilters = () => {
    setFilters({
      search: '',
      genre: '',
      year: '',
      quality: '',
      language: '',
      page: 1,
      limit: 50
    });
  };
  
  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter(value => 
      value && value !== '' && value !== 1 && value !== 50
    ).length;
  }, [filters]);
  
  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <Text fontSize="2xl" fontWeight="bold">Contenido Escaneado</Text>
          <HStack>
            <Button
              leftIcon={<FilterIcon />}
              variant={activeFiltersCount > 0 ? "solid" : "outline"}
              colorScheme={activeFiltersCount > 0 ? "blue" : "gray"}
              onClick={onFiltersOpen}
            >
              Filtros Avanzados
              {activeFiltersCount > 0 && (
                <Badge ml={2} colorScheme="blue">{activeFiltersCount}</Badge>
              )}
            </Button>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" onClick={clearFilters}>
                Limpiar Filtros
              </Button>
            )}
          </HStack>
        </HStack>
        
        {/* Quick Search */}
        <HStack>
          <Box flex={1}>
            <Input
              placeholder="Buscar contenido..."
              leftElement={<SearchIcon color="gray.400" />}
              value={filters.search}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
            />
          </Box>
          <Select
            placeholder="Calidad"
            value={filters.quality}
            onChange={(e) => handleFilterChange({ quality: e.target.value })}
            w="150px"
          >
            {filterOptions?.qualities?.map(quality => (
              <option key={quality} value={quality}>{quality}</option>
            ))}
          </Select>
          <Select
            placeholder="Año"
            value={filters.year}
            onChange={(e) => handleFilterChange({ year: e.target.value })}
            w="120px"
          >
            {filterOptions?.years?.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </Select>
        </HStack>
        
        {/* Content Tabs */}
        <Tabs index={activeTab} onChange={setActiveTab} variant="enclosed">
          <TabList>
            <Tab>
              <HStack>
                <Text>Películas</Text>
                <Badge colorScheme="blue">
                  {contentData?.total || 0}
                </Badge>
              </HStack>
            </Tab>
            <Tab>
              <HStack>
                <Text>Series</Text>
                <Badge colorScheme="green">
                  {contentData?.total || 0}
                </Badge>
              </HStack>
            </Tab>
            <Tab>
              <HStack>
                <Text>Canales</Text>
                <Badge colorScheme="orange">
                  {contentData?.total || 0}
                </Badge>
              </HStack>
            </Tab>
          </TabList>
          
          <TabPanels>
            <TabPanel px={0}>
              <ContentTable
                data={contentData?.items || []}
                type="movies"
                isLoading={isLoading}
                onContentClick={handleContentClick}
                pagination={{
                  current: filters.page,
                  total: contentData?.totalPages || 1,
                  onChange: handlePageChange
                }}
              />
            </TabPanel>
            <TabPanel px={0}>
              <ContentTable
                data={contentData?.items || []}
                type="series"
                isLoading={isLoading}
                onContentClick={handleContentClick}
                pagination={{
                  current: filters.page,
                  total: contentData?.totalPages || 1,
                  onChange: handlePageChange
                }}
              />
            </TabPanel>
            <TabPanel px={0}>
              <ContentTable
                data={contentData?.items || []}
                type="channels"
                isLoading={isLoading}
                onContentClick={handleContentClick}
                pagination={{
                  current: filters.page,
                  total: contentData?.totalPages || 1,
                  onChange: handlePageChange
                }}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
      
      {/* Advanced Filters Modal */}
      <AdvancedFilters
        isOpen={isFiltersOpen}
        onClose={onFiltersClose}
        filters={filters}
        filterOptions={filterOptions}
        onFiltersChange={handleFilterChange}
      />
      
      {/* Content Detail Modal */}
      <ContentModal
        isOpen={isModalOpen}
        onClose={onModalClose}
        content={selectedContent}
      />
    </Box>
  );
};

export default Content;